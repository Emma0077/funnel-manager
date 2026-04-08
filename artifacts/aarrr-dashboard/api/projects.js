export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    method: req.method,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    adminEmail: process.env.ADMIN_EMAIL || null,
  });
}
