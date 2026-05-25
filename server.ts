import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import webpush from "web-push";

try {
  if (!admin.apps?.length) {
    if (
      fs.existsSync(
        path.resolve(process.cwd(), "firebase-service-account.json"),
      )
    ) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "firebase-service-account.json"),
          "utf8",
        ),
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  }
} catch (e) {
  console.log("Firebase Admin init error:", e);
}

// Global VAPID state
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

async function initializeVapid() {
    try {
        if (!vapidPublicKey || !vapidPrivateKey) {
            const vapidPath = path.resolve(process.cwd(), "vapid.json");
            if (fs.existsSync(vapidPath)) {
                const keys = JSON.parse(fs.readFileSync(vapidPath, "utf-8"));
                vapidPublicKey = keys.publicKey;
                vapidPrivateKey = keys.privateKey;
            } else {
                const keys = webpush.generateVAPIDKeys();
                vapidPublicKey = keys.publicKey;
                vapidPrivateKey = keys.privateKey;
                fs.writeFileSync(vapidPath, JSON.stringify(keys, null, 2), "utf-8");
            }
        }
        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(
              'mailto:vibegadgets@example.com',
              vapidPublicKey,
              vapidPrivateKey
            );
            console.log("VAPID Keys Initialized.");
        }
    } catch(e) {
        console.error("VAPID Init Error", e);
    }
}

async function startServer() {
  await initializeVapid();
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get("/api/web-push/public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post("/api/web-push/subscribe", express.json(), async (req, res) => {
    try {
      if (!admin.apps?.length) return res.status(500).json({ error: "Firebase not initialized" });
      const { subscription, uid } = req.body;
      if (!subscription) return res.status(400).json({ error: "No subscription provided" });

      const db = getFirestore();
      
      // We can store subscriptions globally rather than under users
      // Or we can save them uniquely by endpoint to avoid duplicates
      // The endpoint URL is unique per device
      const endpointHash = Buffer.from(subscription.endpoint).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      await db.collection("web_push_subscriptions").doc(endpointHash).set({
        subscription,
        uid: uid || null,
        createdAt: FieldValue.serverTimestamp()
      });

      res.status(201).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/send-push-all", express.json(), async (req, res) => {
    try {
      const { title, body, image, link } = req.body;
      
      let successCount = 0;
      let fcmTokens: string[] = [];
      let subscriptions: any[] = [];

      try {
        const db = getFirestore();
        const usersSnap = await db.collection("users").get();
        fcmTokens = usersSnap.docs.map((doc: any) => doc.data().fcmToken).filter(Boolean);

        const subSnap = await db.collection("web_push_subscriptions").get();
        subscriptions = subSnap.docs.map((doc: any) => doc.data().subscription).filter(Boolean);
      } catch (e) {
        console.error("Failed to fetch tokens", e);
      }

      if (fcmTokens.length === 0 && subscriptions.length === 0) {
        return res.status(400).json({ error: "No users subscribed to push notifications" });
      }

      // 1. FCM Tokens (Legacy Native or other methods) - requires Admin SDK
      if (fcmTokens.length > 0 && admin.apps?.length) {
          const message: any = {
            notification: {
              title,
              body,
              ...(image && { image }),
            },
            webpush: {
              fcmOptions: {
                link: link || "/",
              },
            },
            tokens: [],
          };
    
          for (let i = 0; i < fcmTokens.length; i += 500) {
            message.tokens = fcmTokens.slice(i, i + 500);
            try {
               await getMessaging().sendEachForMulticast(message);
               successCount += message.tokens.length;
            } catch(e) { console.error('FCM Error', e); }
          }
      }

      // 2. Web Push Subscriptions
      if (vapidPublicKey && vapidPrivateKey && subscriptions.length > 0) {
          const payload = JSON.stringify({
              title,
              body,
              icon: 'https://vibe-gadget.vercel.app/apple-touch-icon.png',
              image: image || undefined,
              url: link || '/'
          });

          const notificationPromises = subscriptions.map(async (subscription: any) => {
              try {
                  await webpush.sendNotification(subscription, payload);
                  successCount++;
              } catch (error: any) {
                  if (error.statusCode === 410 || error.statusCode === 404) {
                     // Subscription expired or unsubscribed handled via frontend
                  } else {
                     console.error('Web push error:', error);
                  }
              }
          });

          await Promise.all(notificationPromises);
      }

      if (successCount === 0 && fcmTokens.length === 0 && subscriptions.length === 0) {
         return res.status(400).json({ error: "No target tokens or subscriptions provided." });
      }

      res.json({ success: true, tokensCount: successCount });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/api/notify-telegram", express.json(), async (req, res) => {
    try {
      const { userName, message } = req.body;

      const botToken = "8236254617:AAFFTI9j4pl6U-8-pdJgZigWb2M75oBmyzg";
      const chatId = "5494141897";

      if (botToken && chatId) {
        const text = `<b>💬 New Chat Message</b>\n━━━━━━━━━━━━━━━━━━\n<b>👤 From:</b> ${userName}\n<b>📝 Message:</b>\n${message}\n━━━━━━━━━━━━━━━━━━\n<i>Reply from admin panel</i>`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Telegram notify err", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/admin/change-password", express.json(), async (req, res) => {
    try {
      if (!admin.apps?.length) {
        return res
          .status(500)
          .json({
            error:
              "Firebase Admin not initialized. Please add FIREBASE_SERVICE_ACCOUNT to your environment variables.",
          });
      }
      const { uid, newPassword, adminToken } = req.body;

      if (!adminToken) return res.status(401).json({ error: "Unauthorized" });

      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      const adminDoc = await getFirestore()
        .collection("users")
        .doc(decodedToken.uid)
        .get();
      if (
        !adminDoc.exists ||
        (adminDoc.data()?.role !== "admin" &&
          adminDoc.data()?.role !== "staff" &&
          decodedToken.email !== "admin@vibe.shop")
      ) {
        return res
          .status(403)
          .json({ error: "Forbidden. Admin access required." });
      }

      await admin.auth().updateUser(uid, { password: newPassword });
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post('/api/reset-password-request', express.json(), async (req, res) => {
    try {
      const { identifier } = req.body; // email or phone
      if (!admin.apps?.length) {
         return res.status(500).json({ error: 'Firebase Admin not initialized.' });
      }

      const usersRef = getFirestore().collection('users');
      // Search by email, phone, or formatted phone email
      const formattedPhone = identifier.replace(/[-.+\s]/g, '');
      const possibleEmail = formattedPhone.startsWith('880') ? `${formattedPhone}@phone.vibegadget.com` : `880${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}@phone.vibegadget.com`;
      
      let userDoc = null;
      
      const emailQuery = await usersRef.where('email', '==', identifier).limit(1).get();
      if (!emailQuery.empty) userDoc = emailQuery.docs[0];
      
      if (!userDoc) {
         const phoneEmailQuery = await usersRef.where('email', '==', possibleEmail).limit(1).get();
         if (!phoneEmailQuery.empty) userDoc = phoneEmailQuery.docs[0];
      }

      if (!userDoc) {
          // Try scanning phones
          const allUsers = await usersRef.get();
          for (let doc of allUsers.docs) {
             const data = doc.data();
             if (data.phoneNumber && data.phoneNumber.replace(/[-.+\s]/g, '').includes(formattedPhone)) {
                userDoc = doc;
                break;
             }
          }
      }

      if (!userDoc) {
         return res.status(404).json({ error: 'No account found with this number' });
      }

      const userData = userDoc.data();
      
      // Save request to db
      await getFirestore().collection('passwordResets').add({
         uid: userData.uid,
         email: userData.email,
         displayName: userData.displayName || 'Unknown',
         phoneNumber: userData.phoneNumber || identifier,
         createdAt: Date.now(),
         status: 'pending'
      });

      // Send telegram
      const botToken = "8236254617:AAFFTI9j4pl6U-8-pdJgZigWb2M75oBmyzg";
      const chatId = "5494141897";
      const message = `<b>🔐 Password Reset Request</b>\n━━━━━━━━━━━━━━━━━━\n<b>👤 Name:</b> ${userData.displayName || 'Unknown'}\n<b>📞 Phone:</b> <code>${userData.phoneNumber || identifier}</code>\n<b>📧 Email:</b> <code>${userData.email}</code>\n<b>🆔 UID:</b> <code>${userData.uid}</code>\n━━━━━━━━━━━━━━━━━━\n<i>User requested a password reset. You can set a new password from the Manage Users panel and send it via Whatsapp/SMS.</i>`;
      
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      }).catch(e => console.error("Telegram error:", e));

      res.json({ success: true, method: 'phone', mask: userData.phoneNumber || identifier });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/api/gateway/sms", express.json(), async (req, res) => {
    try {
      if (!admin.apps?.length) {
        return res.status(500).json({ error: "Firebase Admin not initialized." });
      }

      // Expected format from the Android App
      const { device_key, sender, message, receiver_sim } = req.body;

      if (!device_key || !sender || !message) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      // Fetch gateway settings to verify device key
      const db = getFirestore();
      const settingsSnap = await db.collection("settings").doc("payment_gateway").get();
      const settings = settingsSnap.data() || {};

      if (settings.deviceKey !== device_key && device_key !== process.env.DEVICE_KEY) {
        return res.status(401).json({ error: "Invalid Device Key" });
      }

      // We only care about known banking senders (e.g., bKash, Nagad)
      const lcSender = sender.toLowerCase();
      let transactionId = null;
      let amount = null;

      // Extract transaction ID and Amount
      if (lcSender.includes("bkash")) {
        // e.g. "Payment Tk 150.00 to 01XXX... successful. TrxID 8I25A..."
        // e.g. "You have received Tk 150.00 from ... TrxID 8I34B..."
        const trxMatch = message.match(/TrxID[ :]+([A-Z0-9]+)/i);
        const amountMatch = message.match(/Tk[ :]+([\d,.]+)/i);
        if (trxMatch) transactionId = trxMatch[1];
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      } else if (lcSender.includes("nagad")) {
        // e.g. "Payment successful... Amount: Tk 250.00 ... TxnID: 7IH4B..."
        const trxMatch = message.match(/TxnID[ :]+([A-Z0-9]+)/i);
        const amountMatch = message.match(/(?:Tk|Amount)[ :]+([\d,.]+)/i);
        if (trxMatch) transactionId = trxMatch[1];
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      } else {
        // Generic parser for other SMS (e.g. Rocket, Upay)
        const trxMatch = message.match(/(?:TrxID|TxnId|TxID|Transaction ID)[ :]*([A-Z0-9]+)/i);
        const amountMatch = message.match(/(?:Tk|Amount|BDT)[ .:]*([0-9,.]+)/i);
        if (trxMatch) transactionId = trxMatch[1];
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      }

      // Log the SMS
      await db.collection("sms_logs").add({
        sender,
        message,
        receiver_sim: receiver_sim || "Unknown",
        transactionId,
        amount,
        createdAt: FieldValue.serverTimestamp(),
        processed: transactionId ? false : true, // Mark non-transactions as processed
      });

      // If we found a TrxID and Amount, look for a matching pending order
      if (transactionId && amount) {
        // Find pending orders matching the amount
        const ordersSnap = await db.collection("orders")
          .where("status", "==", "Pending")
          .get();

        let matchedOrder = null;
        for (const doc of ordersSnap.docs) {
          const order = doc.data();
          // We check if amount closely matches the total
          if (Math.abs((order.totalAmount || order.total || 0) - amount) <= 1) {
            matchedOrder = doc;
            break;
          }
        }

        // We can also allow the user to input the TrxID during checkout,
        // and check against it here.
        if (!matchedOrder) {
            // Find order where user manually entered this TrxID
            const manualTrxSnap = await db.collection("orders")
                .where("transactionId", "==", transactionId)
                .where("status", "==", "Pending")
                .limit(1)
                .get();
            if (!manualTrxSnap.empty) {
                matchedOrder = manualTrxSnap.docs[0];
            }
        }

        if (matchedOrder) {
          // Auto-verify and update order
          await matchedOrder.ref.update({
            status: "Processing",
            paymentStatus: "Paid",
            autoVerified: true,
            verifiedTrxId: transactionId,
            verifiedAt: FieldValue.serverTimestamp()
          });

          // Also set sms log as processed
          const recentLogs = await db.collection("sms_logs")
             .where("transactionId", "==", transactionId)
             .limit(1)
             .get();
          if (!recentLogs.empty) {
             await recentLogs.docs[0].ref.update({ processed: true, orderId: matchedOrder.id });
          }
        }
      }

      res.json({ success: true, message: "SMS logged." });
    } catch (error: any) {
      console.error("SMS Gateway Error:", error);
      res.status(500).json({ error: String(error.message || error) });
    }
  });

  // Simple REST fetcher for product data to avoid loading Firebase Client SDK in Node
  const fetchProductData = async (productId: string) => {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/vibegadgets-ae9d1/databases/(default)/documents/products/${productId}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.fields;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const isProd = process.env.NODE_ENV === "production";
  let vite: any;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in prod except index.html
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
  }

  app.get("*all", async (req, res) => {
    try {
      let template: string;

      if (!isProd) {
        template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(
          path.join(process.cwd(), "dist", "index.html"),
          "utf-8",
        );
      }

      const toSlug = (name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      // Check if it's a product page matching `/product/:id` or `/:slug`
      const productMatch = req.path.match(/^\/product\/(.+)$/);
      let isSlugMatch = false;
      let slugValue = "";

      const knownRoutes = [
        "/",
        "/onboarding",
        "/auth-selector",
        "/signin",
        "/signup",
        "/verify",
        "/complete-profile",
        "/location",
        "/cart",
        "/checkout",
        "/deposit",
        "/my-coupons",
        "/my-coins",
        "/bonus",
        "/credits",
        "/bundles",
        "/success",
        "/profile",
        "/affiliate",
        "/withdraw",
        "/orders",
        "/notifications",
        "/wishlist",
        "/search",
        "/all-products",
        "/flash-sale",
        "/blog",
        "/settings",
        "/help-center",
        "/privacy",
        "/about",
        "/terms",
        "/contact",
        "/sitemap-page",
        "/shipping-address",
        "/payment-methods",
        "/coupon",
        "/add-card",
        "/new-password",
        "/forgot-password",
        "/admin",
      ];

      if (
        !productMatch &&
        !knownRoutes.some((r) => req.path === r || req.path.startsWith(r + "/"))
      ) {
        const potentialSlugMatch = req.path.match(/^\/([^\/]+)$/);
        if (potentialSlugMatch && potentialSlugMatch[1]) {
          isSlugMatch = true;
          slugValue = potentialSlugMatch[1];
        }
      }

      let product: any = null;

      if (productMatch && productMatch[1]) {
        const productId = productMatch[1].split("/")[0];
        product = await fetchProductData(productId);
      } else if (isSlugMatch && admin.apps?.length) {
        try {
          const snapshot = await getFirestore().collection("products").get();
          for (const doc of snapshot.docs) {
            const data = doc.data();
            if (
              data.name &&
              (toSlug(data.name) === slugValue ||
                decodeURIComponent(slugValue) === data.name)
            ) {
              product = { ...data };
              break;
            }
          }
          // Format fields for compatibility with fetchProductData response
          if (product) {
            const formattedProduct: any = {};
            for (const [k, v] of Object.entries(product)) {
              if (typeof v === "string")
                formattedProduct[k] = { stringValue: v };
              else if (typeof v === "number")
                formattedProduct[k] = { numberValue: v };
              else if (Array.isArray(v))
                formattedProduct[k] = {
                  arrayValue: {
                    values: v.map((val) => ({ stringValue: val })),
                  },
                };
              else formattedProduct[k] = { stringValue: String(v) }; // fallback
            }
            product = formattedProduct;
          }
        } catch (e) {}
      }

      if (product) {
        const title = product.name?.stringValue || "Vibe Gadgets";
        const description =
          product.description?.stringValue ||
          "Check out this amazing product on Vibe Gadgets.";
        const imageUrl =
          product.image?.stringValue ||
          product.images?.arrayValue?.values?.[0]?.stringValue ||
          "https://vibe-gadget.vercel.app/og-image.jpg";
        const price =
          product.price?.numberValue ||
          product.price?.integerValue ||
          product.price?.doubleValue ||
          0;

        let metaTags = `
          <title>${title} | Vibe Gadgets</title>
          <meta name="description" content="${description}" />
          <meta property="og:title" content="${title} | Vibe Gadgets" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:type" content="product" />
          <meta property="product:price:amount" content="${price}" />
          <meta property="product:price:currency" content="BDT" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${imageUrl}" />
        `;

        // Inject meta tags
        const metaRegex =
          /<!-- META_TAGS_PLACEHOLDER -->[\s\S]*?<!-- END_META_TAGS_PLACEHOLDER -->/;
        if (metaRegex.test(template)) {
          template = template.replace(metaRegex, metaTags);
        } else {
          template = template.replace("</head>", `${metaTags}\n</head>`);
        }
      } else if (req.path === "/" && admin.apps?.length) {
        // Fetch home SEO
        try {
          const seoSnap = await getFirestore()
            .collection("settings")
            .doc("seo")
            .get();
          if (seoSnap.exists) {
            const data = seoSnap.data() as any;
            const title = data.metaTitle || "Vibe Gadgets | Premium Tech Hub";
            const description =
              data.metaDescription ||
              "Vibe Gadgets - Discover the latest gadgets, mobile phones & accessories.";
            const imageUrl =
              data.metaImage || "https://vibe-gadget.vercel.app/og-image.jpg";

            let metaTags = `
                <title>${title}</title>
                <meta name="description" content="${description}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${imageUrl}" />
             `;
            template = template.replace("</head>", `${metaTags}\n</head>`);
          }
        } catch (e) {}
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e);
      }
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
