"use client";

import PusherClient from "pusher-js";

const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  authEndpoint: "/api/chat/pusher-auth",
});

export default pusherClient;
