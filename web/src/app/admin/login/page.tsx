export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);
  return (
    <form method="post" action="/api/admin/login" className="max-w-sm mx-auto mt-20 panel p-6 space-y-3">
      <h1 className="text-[20px] font-bold">Qarin admin</h1>
      {!configured && <p className="text-warn text-[14px]">ADMIN_PASSWORD is not set — admin is locked.</p>}
      {e && <p className="text-warn text-[14px]">Wrong password.</p>}
      <label className="block text-[14px]">Password
        <input name="password" type="password" required autoFocus className="mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface" />
      </label>
      <button disabled={!configured} className="w-full h-10 rounded-md bg-ink text-surface font-medium disabled:opacity-50">Sign in</button>
    </form>
  );
}
