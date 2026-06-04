import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import prisma from "../lib/prisma";
import { error, success } from "../lib";
import { sendEmail } from "../lib/email";
import React from "react";
import { ShippingNotification } from "../emails/ShippingNotification";

/**
 * Lumaprints webhook handler.
 * Lumaprints sends POST events with a JSON body containing an `event` field.
 * Relevant event: "order.shipped" (or similar — adjust field names to match
 * the actual Lumaprints webhook payload once confirmed in their docs).
 *
 * Expected payload shape (based on Lumaprints API conventions):
 * {
 *   event: "order.shipped",
 *   data: {
 *     externalId: "<our orderId>",
 *     trackingNumber: "1Z...",
 *     carrier: "UPS",
 *     trackingUrl: "https://...",
 *     estimatedDelivery: "2025-06-05",
 *   }
 * }
 * 
 * actual {
  orderNumber: '10000000000',
  shipments: [
    {
      carrier: 'FedEx',
      shippingMethod: 'FedEx Ground',
      trackingNumber: '300000000000',
      shipmentDate: '2023-12-01',
      shipmentItems: [Array]
    }
  ]
}
 */

export const handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "null");
  } catch {
    return error("Invalid JSON", 400);
  }

  console.log("Lumaprints webhook body:", body);

  try {
    const orderNumber: string | undefined = body?.orderNumber
      ? String(body.orderNumber)
      : undefined;

    if (!orderNumber) {
      console.warn("[lumaprints-webhook] Missing orderNumber", body);
      return success({ received: true });
    }

    const shipments: any[] = body.shipments ?? [];
    const firstShipment = shipments[0];

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        recipient: true,
        orderItems: { include: { mapConfig: { select: { title: true } } } },
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      console.warn(
        "[lumaprints-webhook] Order not found for orderNumber",
        orderNumber,
      );
      return success({ received: true });
    }

    await prisma.order
      .update({
        where: { orderNumber },
        data: { status: "shipped" },
      })
      .catch(() => {
        console.warn(
          "[lumaprints-webhook] Could not update order status to shipped",
        );
      });

    const recipientEmail = order.recipient?.email ?? order.user?.email;
    const recipientName = order.recipient?.name ?? order.user?.name ?? "there";

    if (recipientEmail && firstShipment) {
      await sendEmail({
        to: recipientEmail,
        subject: "Your TopoJoy order has shipped!",
        template: React.createElement(ShippingNotification, {
          recipientName,
          trackingNumber: firstShipment.trackingNumber ?? "N/A",
          carrier:
            firstShipment.carrier ?? firstShipment.shippingMethod ?? "Carrier",
          estimatedDelivery: firstShipment.shipmentDate ?? undefined,
          items: order.orderItems.map((item) => ({
            title: item.mapConfig?.title ?? "Topographic Map Print",
            quantity: item.quantity,
          })),
        }),
      }).catch((e: any) =>
        console.error("[email] Shipping notification failed:", e),
      );
    }

    return success({ received: true });
  } catch (err: any) {
    console.error("[lumaprints-webhook] Error:", err);
    return error(err.message || "Internal server error", 500);
  }
};
