import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

type GroupMember = {
  id: number | string;
  username?: string;
  name?: string;
  email?: string;
  isGroupLeader?: boolean;
};

type AuthUser = {
  id: number;
  username: string;
  email: string;
  role?: "teacher" | "student";
  groupId?: string | null;
  groupName?: string | null;
  groupIcon?: string | null;
  isGroupLeader?: boolean;
  groupMembers?: GroupMember[];
};

type AuthPageProps = {
  onLoginSuccess: (token: string, user: AuthUser) => void;
};

function normalizeAuthUser(user: any): AuthUser {
  return {
    id: Number(user?.id),
    username: String(user?.username || ""),
    email: String(user?.email || ""),
    role: user?.role === "teacher" ? "teacher" : "student",
    groupId: user?.groupId ?? null,
    groupName: user?.groupName ?? null,
    groupIcon: user?.groupIcon ?? null,
    isGroupLeader: Boolean(user?.isGroupLeader),
    groupMembers: Array.isArray(user?.groupMembers) ? user.groupMembers : [],
  };
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedAccount = account.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (mode === "login" && (!trimmedAccount || !trimmedPassword)) {
      setMessage("請輸入帳號與密碼");
      return;
    }

    if (mode === "register" && (!trimmedUsername || !trimmedEmail || !trimmedPassword)) {
      setMessage("請填寫完整資料");
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const url = mode === "login" ? `${API_BASE}/api/login` : `${API_BASE}/api/register`;
      const body = mode === "login"
        ? { account: trimmedAccount, password: trimmedPassword }
        : { username: trimmedUsername, email: trimmedEmail, password: trimmedPassword };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || "操作失敗");
        return;
      }

      if (mode === "register") {
        setMessage("註冊成功，請登入");
        setMode("login");
        setPassword("");
        return;
      }

      if (!data.token || !data.user) {
        setMessage("登入回傳資料不完整，請重新登入");
        return;
      }

      const nextUser = normalizeAuthUser(data.user);
      localStorage.setItem("cityauncel_token", data.token);
      localStorage.setItem("cityauncel_user", JSON.stringify(nextUser));

      setIsSubmitting(false);
      onLoginSuccess(data.token, nextUser);
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.name === "AbortError"
          ? "登入逾時，請確認後端伺服器與資料庫是否正常"
          : "無法連線到伺服器，請確認後端網址設定"
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7efe1] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-[28px] border-4 border-[#6b4f2a] bg-[#fffaf0] p-6 shadow-xl">
        <h1 className="text-3xl font-black text-center text-[#3f2f1c]">CityAuncel</h1>
        <p className="mt-2 text-center font-bold text-[#6b4f2a]">
          {mode === "login" ? "登入遊戲帳號" : "建立遊戲帳號"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <input className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none" placeholder="使用者名稱" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </>
          )}

          {mode === "login" && (
            <input className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none" placeholder="帳號或 Email" value={account} onChange={(e) => setAccount(e.target.value)} />
          )}

          <input className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none" placeholder="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {message && <p className="text-center font-bold text-red-700">{message}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl border-2 border-[#3f2f1c] bg-[#8b5e34] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "處理中..." : mode === "login" ? "登入" : "註冊"}
          </button>
        </form>

        <button type="button" onClick={() => { if (isSubmitting) return; setMessage(""); setMode(mode === "login" ? "register" : "login"); }} className="mt-4 w-full font-bold text-[#6b4f2a] underline">
          {mode === "login" ? "還沒有帳號？前往註冊" : "已有帳號？返回登入"}
        </button>
      </section>
    </main>
  );
}
