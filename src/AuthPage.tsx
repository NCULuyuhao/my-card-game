import { useState } from "react";

type AuthUser = {
  id: number;
  username: string;
  email: string;
};

type AuthPageProps = {
  onLoginSuccess: (token: string, user: AuthUser) => void;
};

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const apiBaseUrl = "http://localhost:3001";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const url =
      mode === "login"
        ? `${apiBaseUrl}/api/login`
        : `${apiBaseUrl}/api/register`;

    const body =
      mode === "login"
        ? { account, password }
        : { username, email, password };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || "操作失敗");
      return;
    }

    if (mode === "register") {
      setMessage("註冊成功，請登入");
      setMode("login");
      return;
    }

    localStorage.setItem("cityauncel_token", data.token);
    localStorage.setItem("cityauncel_user", JSON.stringify(data.user));

    onLoginSuccess(data.token, data.user);
  }

  return (
    <main className="min-h-screen bg-[#f7efe1] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-[28px] border-4 border-[#6b4f2a] bg-[#fffaf0] p-6 shadow-xl">
        <h1 className="text-3xl font-black text-center text-[#3f2f1c]">
          CityAuncel
        </h1>

        <p className="mt-2 text-center font-bold text-[#6b4f2a]">
          {mode === "login" ? "登入遊戲帳號" : "建立遊戲帳號"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <input
                className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none"
                placeholder="使用者名稱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <input
                className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          {mode === "login" && (
            <input
              className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none"
              placeholder="帳號或 Email"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          )}

          <input
            className="w-full rounded-xl border-2 border-[#6b4f2a] bg-white px-4 py-3 font-bold outline-none"
            placeholder="密碼"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {message && (
            <p className="text-center font-bold text-red-700">{message}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl border-2 border-[#3f2f1c] bg-[#8b5e34] px-4 py-3 font-black text-white"
          >
            {mode === "login" ? "登入" : "註冊"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setMode(mode === "login" ? "register" : "login");
          }}
          className="mt-4 w-full font-bold text-[#6b4f2a] underline"
        >
          {mode === "login" ? "還沒有帳號？前往註冊" : "已有帳號？返回登入"}
        </button>
      </section>
    </main>
  );
}