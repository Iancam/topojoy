import type { HandlerEvent, HandlerContext } from "@netlify/functions";

import { Webhook } from "svix";
import prisma from "../lib/prisma";
import { error, success } from "../lib";

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("You need a WEBHOOK_SECRET in your .env");
  }
  const svix_id = event.headers["svix-id"];
  const svix_timestamp = event.headers["svix-timestamp"];
  const svix_signature = event.headers["svix-signature"];

  // If there are missing Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return error("Error occurred -- no svix headers", 400);
  }

  if (!event.body) {
    return error("Error occurred -- no body", 400);
  }
  // Initiate Svix
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;
  // Attempt to verify the incoming webhook
  // If successful, the payload will be available from 'evt'
  // If the verification fails, error out and  return error code
  try {
    evt = wh.verify(event.body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    // Console log and return error
    console.log("Webhook failed to verify. Error:", err.message);
    return error(err.message, 400);
  }

  const body = JSON.parse(event.body);

  if (body.type === "user.created") {
    try {
      const user = await prisma.user.create({
        data: {
          clerkId: body.data.id,
          email: body.data.email_addresses?.[0]?.email_address,
          name: body.data.first_name + " " + body.data.last_name,
          createdAt: new Date(body.data.created_at),
        },
      });

      return success({
        message: "User created successfully",
      });
    } catch (err: any) {
      return error(err.message, 500);
    }
  }

  return error("Error occurred -- not a user.created event", 400);
};
