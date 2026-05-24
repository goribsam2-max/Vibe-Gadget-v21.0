import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import { AuthLayout, AuthSeparator } from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import { AuthInputs } from "../components/AuthInputs";
import { VibeMascot, MascotState } from "../components/ui/VibeMascot";
import { PasswordStrength } from "../components/ui/PasswordStrength";

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  
  const [authType, setAuthType] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mascotFocus, setMascotFocus] = useState<'idle' | 'name' | 'email' | 'password' | 'success'>('idle');
  const navigate = useNavigate();

  let mascotState: MascotState = 'idle';
  if (mascotFocus === 'name') mascotState = name.length > 0 ? 'name-typed' : 'name-empty';
  else if (mascotFocus === 'email') mascotState = 'email';
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree)
      return notify("Please agree to the Terms & Conditions", "error");

    if (authType === "email") {
      const allowed = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"];
      const domain = email.split("@")[1];
      if (email !== "admin@vibe.shop" && (!domain || !allowed.includes(domain))) {
        return notify("Only Gmail, Yahoo, Outlook, and iCloud are allowed.", "error");
      }
    } else if (authType === "phone" && phoneNumber.length < 6) {
      return notify("Please enter a valid phone number.", "error");
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (password.length < 8 || !hasLower || !hasUpper || !hasNumber || !hasSpecial) {
       return notify("Please ensure your password meets all strength requirements.", "error");
    }

    setLoading(true);
    const authEmail = getAuthEmail();
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        authEmail,
        password,
      );
      const user = userCred.user;
      await updateProfile(user, { displayName: name });

      try {
          const accountsStr = localStorage.getItem("vibe_saved_accounts");
          let accounts = accountsStr ? JSON.parse(accountsStr) : [];
          accounts = accounts.filter((a: any) => a.uid !== user.uid);
          accounts.push({
              uid: user.uid,
              email: authEmail,
              password: password,
              displayName: name,
              photoURL: "",
              lastPasswordChange: null,
          });
          localStorage.setItem("vibe_saved_accounts", JSON.stringify(accounts));
      } catch (e) {}

      const userData = {
        uid: user.uid,
        email: authEmail,
        displayName: name,
        role: "user",
        isBanned: false,
        createdAt: Date.now(),
        registrationDate: Date.now(),
        lastActive: Date.now(),
      };

      await setDoc(doc(db, "users", user.uid), userData);

      setMascotFocus("success");
      notify("Account created successfully!", "success");
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start exploring premium gadgets today."
    >
      <VibeMascot state={mascotState} showPassword={showPassword} />
      <form onSubmit={handleSignUp} className="space-y-4 relative z-20">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Full Name
            </label>
            <div className="relative h-max">
              <Input
                placeholder="e.g. John Doe"
                className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setMascotFocus('name')}
                onBlur={() => setMascotFocus('idle')}
                required
              />
              <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-disabled:opacity-50">
                <User className="size-4" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div onFocus={() => setMascotFocus('email')} onBlur={() => setMascotFocus('idle')} tabIndex={-1}>
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
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <div className="relative h-max">
              <Input
                placeholder="At least 8 characters"
                className="peer ps-10 pe-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setMascotFocus('password')}
                onBlur={() => setMascotFocus('idle')}
                minLength={8}
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
            
            {(password.length > 0 || mascotFocus === 'password') && (
               <PasswordStrength password={password} />
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <input
            type="checkbox"
            id="terms"
            className="w-4 h-4 accent-zinc-900 dark:accent-white bg-zinc-100 dark:bg-zinc-800 border-zinc-300 rounded focus:ring-zinc-900 dark:ring-zinc-100 focus:ring-2 cursor-pointer"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <label
            htmlFor="terms"
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer"
          >
            I agree to the{" "}
            <Link to="/terms" className="text-zinc-900 dark:text-zinc-100 font-semibold underline underline-offset-2">
              Terms & Conditions
            </Link>
          </label>
        </div>

        <Button
          disabled={loading}
          className="w-full h-12 mt-6 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-semibold shadow-lg shadow-black/20 dark:shadow-white/10"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <AuthSeparator text="ALREADY HAVE AN ACCOUNT?" />
      
      <Button 
        type="button" 
        variant="outline"
        className="w-full h-12 font-semibold border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-xl"
        onClick={() => navigate("/signin")}
      >
        Sign In Instead
      </Button>
    </AuthLayout>
  );
};

export default SignUp;
