import PusherServer from "pusher";

const pusher = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown
) {
  return pusher.trigger(channel, event, data);
}

export function authorizeChannel(socketId: string, channelName: string) {
  return pusher.authorizeChannel(socketId, channelName);
}

export default pusher;
