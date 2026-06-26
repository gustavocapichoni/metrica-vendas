import { motion } from "motion/react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

interface LoginProps {
  onError?: (msg: string) => void;
}

export default function Login({ onError }: LoginProps) {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      onError?.("Não foi possível fazer login. Tente novamente.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 60% 20%, #1e1b4b 0%, #0f0a1e 40%, #020617 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
        style={{ background: "radial-gradient(circle, #10b981, transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div
          className="rounded-3xl p-10 flex flex-col items-center gap-8 border border-white/10 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Logo / Icon */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                MétricaVendas
              </h1>
              <p className="text-xs text-white/40 mt-1 font-medium tracking-wide uppercase">
                Gestão de Doces & Caixas
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/10" />

          {/* Greeting */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Bem-vindo de volta!</h2>
            <p className="text-sm text-white/50 mt-1 max-w-xs">
              Faça login com sua conta Google para acessar seus dados de vendas em
              qualquer dispositivo.
            </p>
          </div>

          {/* Google Sign-In Button */}
          <motion.button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer border border-white/15 shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
              color: "white",
            }}
          >
            {/* Google SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20H24v8h11.3C33.9 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.4 0-9.9-3.1-11.3-7.6l-6.6 5.1C9.5 39.3 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20H24v8h11.3c-.7 2-2.1 3.7-3.8 4.8l6.2 5.2C41.5 34.6 44 29.8 44 24c0-1.3-.1-2.7-.4-4z"
              />
            </svg>
            <span>Entrar com o Google</span>
          </motion.button>

          {/* Footer note */}
          <p className="text-[11px] text-white/25 text-center leading-relaxed">
            Seus dados ficam vinculados à sua conta Google e são salvos com
            segurança na nuvem.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
