const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = true
) {

  const res = await fetch(
    `${BASE}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        remember_me: rememberMe,
      }),
    }
  );

  return res.json();
}