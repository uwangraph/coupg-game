export async function onRequest(context) {
  if (!context.env.WORKER) {
    return new Response("Error: Service Binding 'WORKER' tidak ditemukan di dashboard Pages.", { status: 500 });
  }
  try {
    return await context.env.WORKER.fetch(context.request);
  } catch (err) {
    return new Response("Error saat fetch ke Worker: " + err.message, { status: 500 });
  }
}
