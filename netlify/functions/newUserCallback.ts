import type { HandlerEvent, HandlerContext } from "@netlify/functions";

import { PrismaClient } from "@prisma/client";
import { Webhook } from "svix";
const prisma = new PrismaClient();

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("You need a WEBHOOK_SECRET in your .env");
  }
  const svix_id = event.headers["svix-id"];
  const svix_timestamp = event.headers["svix-timestamp"];
  const svix_signature = event.headers["svix-signature"];

  // If there are missing Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  if (!event.body) {
    return new Response("Error occurred -- no body", {
      status: 400,
    });
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
    return new Response(
      JSON.stringify({
        success: false,
        message: err.message,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const body = JSON.parse(event.body);

  console.log(body);

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

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.log(err);
      return new Response(err.message, {
        status: 500,
      });
    }

    return new Response("Error occurred -- not a user.created event", {
      status: 400,
    });
  }
};
