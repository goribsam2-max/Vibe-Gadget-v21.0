import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import { AuthLayout, AuthSeparator } from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthInputs } from "../components/AuthInputs";
import { VibeMascot, MascotState } from "../components/ui/VibeMascot";

const SignIn: React.FC = () => {
  const [authType, setAuthType] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mascotFocus, setMascotFocus] = useState<'idle' | 'email' | 'password' | 'success'>('idle');
  const navigate = useNavigate();

  let mascotState: MascotState = 'idle';
  if (mascotFocus === 'email') mascotState = 'email';
  else if (mascotFocus === 'password') mascotState = 'password';
  else if (mascotFocus === 'success') mascotState = 'success';
  const notify = useNotify();

  const getAuthEmail = () => {
    if (authType === "phone") {
      const cleanPhone = phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber;
      return `${countryCode.replace('+', '')}${cleanPhone}@phone.vibegadget.com`;
    }
    return email;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === "email") {
      const allowed = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"];
      const domain = email.split("@")[1];
      if (email !== "admin@vibe.shop" && (!domain || !allowed.includes(domain))) {
        return notify("Only Gmail, Yahoo, Outlook, and iCloud are allowed.", "error");
      }
    } else if (authType === "phone" && phoneNumber.length < 6) {
      return notify("Please enter a valid phone number.", "error");
    }

    setLoading(true);
    const authEmail = getAuthEmail();
    try {
      const userCred = await signInWithEmailAndPassword(auth, authEmail, password);
      const user = userCred.user;

      // Save to Account Center
      try {
          const accountsStr = localStorage.getItem("vibe_saved_accounts");
          let accounts = accountsStr ? JSON.parse(accountsStr) : [];
          accounts = accounts.filter((a: any) => a.uid !== user.uid);
          accounts.push({
              uid: user.uid,
              email: authEmail,
              password: password,
              displayName: user.displayName || "User",
              photoURL: user.photoURL || "",
              lastPasswordChange: null,
          });
          localStorage.setItem("vibe_saved_accounts", JSON.stringify(accounts));
      } catch (e) {
          console.error(e);
      }

      await setDoc(
        doc(db, "users", user.uid),
        { lastActive: Date.now() },
        { merge: true },
      );

      setMascotFocus("success");
      notify("Welcome back!", "success");
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue."
    >
      <VibeMascot state={mascotState} showPassword={showPassword} />
      <form onSubmit={handleSignIn} className="space-y-4 relative z-20">
        <div className="space-y-4">
        
          <div onFocus={() => setMascotFocus('email')} onBlur={() => setMascotFocus('idle')} tabIndex={-1} className="outline-none">
            <AuthInputs 
              authType={authType}
              setAuthType={setAuthType}
              email={email}
              setEmail={setEmail}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                onFocus={() => setMascotFocus('idle')}
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative h-max">
              <Input
                placeholder="••••••••"
                className="peer ps-10 pe-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setMascotFocus('password')}
                onBlur={() => setMascotFocus('idle')}
                required
              />
              <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-disabled:opacity-50">
                <Lock className="size-4" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                onFocus={() => setMascotFocus('password')}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <Button
          disabled={loading}
          className="w-full h-12 mt-6 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-semibold shadow-lg shadow-black/20 dark:shadow-white/10"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <AuthSeparator text="NEW HERE?" />
      
      <Button 
        type="button" 
        variant="outline"
        className="w-full h-12 font-semibold border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-xl"
        onClick={() => navigate("/signup")}
      >
        Create an Account
      </Button>
    </AuthLayout>
  );
};

export default SignIn;
