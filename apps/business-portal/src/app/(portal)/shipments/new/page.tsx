"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "@/lib/api";
import { KARACHI_AREAS, TRACKING_URL } from "@/lib/constants";
import { getStoredClient } from "@/lib/auth";
import type { Shipment } from "@/types";

export default function NewShipmentPage() {
  const client = getStoredClient();
  const [success, setSuccess] = useState<Shipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState(client?.address ?? "");
  const [pickupArea, setPickupArea] = useState<string>(
    client?.area ?? KARACHI_AREAS[0],
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState<string>(KARACHI_AREAS[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "prepaid">("cod");
  const [codAmount, setCodAmount] = useState("");
  const [weightKg, setWeightKg] = useState("0.5");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(null);

    try {
      const res = await apiFetch<{ shipment: Shipment }>("/api/shipments", {
        method: "POST",
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          pickup_address: pickupAddress,
          pickup_area: pickupArea,
          delivery_address: deliveryAddress,
          delivery_area: deliveryArea,
          payment_method: paymentMethod,
          cod_amount:
            paymentMethod === "cod" ? Number(codAmount) || 0 : null,
          weight_kg: Number(weightKg) || 0.5,
          notes: notes || null,
        }),
      });
      setSuccess(res.shipment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  }

  function copyTracking() {
    if (!success) return;
    navigator.clipboard.writeText(success.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareUrl = success
    ? `${TRACKING_URL}/${encodeURIComponent(success.tracking_number)}`
    : "";

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Shipment booked
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your parcel has been registered for same-day pickup.
          </p>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tracking number
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-brand-700">
            {success.tracking_number}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={copyTracking}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {copied ? "Copied!" : "Copy tracking #"}
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Copy share link
            </button>
          </div>

          <p className="mt-4 break-all text-xs text-slate-500">{shareUrl}</p>

          {success.payment_method === "cod" && success.cod_amount != null && (
            <p className="mt-4 text-sm text-slate-600">
              COD: {formatCurrencyPkr(Number(success.cod_amount))}
            </p>
          )}

          <Link
            href={`/shipments/${success.id}/slip`}
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-brand-600 py-4 text-base font-bold text-white shadow-md hover:bg-brand-700"
          >
            Print Waybill Slip
          </Link>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setRecipientName("");
                setRecipientPhone("");
                setDeliveryAddress("");
              }}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium hover:bg-white"
            >
              Book another
            </button>
            <Link
              href="/shipments"
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium hover:bg-white"
            >
              My shipments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">New Shipment</h1>
      <p className="mt-1 text-sm text-slate-500">
        Book a same-day delivery for your customer
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Recipient</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Name *
              </label>
              <input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Phone *
              </label>
              <input
                required
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Pickup</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                Address *
              </label>
              <input
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Area *
              </label>
              <select
                required
                value={pickupArea}
                onChange={(e) => setPickupArea(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {KARACHI_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Delivery</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                Address *
              </label>
              <input
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Area *
              </label>
              <select
                required
                value={deliveryArea}
                onChange={(e) => setDeliveryArea(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {KARACHI_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
          <div className="mt-3 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              COD
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={paymentMethod === "prepaid"}
                onChange={() => setPaymentMethod("prepaid")}
              />
              Prepaid
            </label>
          </div>
          {paymentMethod === "cod" && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600">
                COD amount (PKR) *
              </label>
              <input
                required
                type="number"
                min={1}
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Booking…" : "Book Shipment"}
        </button>
      </form>
    </div>
  );
}
