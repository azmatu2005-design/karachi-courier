"use client";

import { formatCurrencyPkr } from "@karachi-courier/shared";
import type { Shipment } from "@/types";

export function WaybillSlip({
  shipment,
  businessName,
  businessAddress,
  businessArea,
}: {
  shipment: Shipment;
  businessName: string;
  businessAddress: string;
  businessArea: string;
}) {
  const createdDate = new Date(shipment.created_at).toLocaleDateString("en-PK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const paymentLabel =
    shipment.payment_method === "cod"
      ? `COD${shipment.cod_amount != null ? ` · ${formatCurrencyPkr(Number(shipment.cod_amount))}` : ""}`
      : "Prepaid";

  return (
    <div
      id="waybill-slip"
      className="mx-auto w-full max-w-[148mm] border-2 border-black bg-white font-sans text-black shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-black text-lg font-black">
            KC
          </div>
          <div>
            <p className="text-lg font-black uppercase leading-tight tracking-tight">
              Karachi Courier
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
              Same Day Delivery
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold">Date</p>
          <p className="font-mono">{createdDate}</p>
        </div>
      </div>

      {/* Tracking barcode box */}
      <div className="border-b-2 border-black bg-slate-50 px-4 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
          Tracking Number
        </p>
        <div className="mt-2 border-2 border-dashed border-black bg-white px-2 py-3">
          <p
            className="font-mono text-3xl font-black tracking-[0.15em] sm:text-4xl"
            style={{ letterSpacing: "0.12em" }}
          >
            {shipment.tracking_number}
          </p>
          <div className="mx-auto mt-2 flex h-8 max-w-xs justify-center gap-px">
            {shipment.tracking_number.split("").map((char, i) => (
              <div
                key={`${char}-${i}`}
                className="bg-black"
                style={{
                  width: char === "-" ? 4 : 3,
                  height: char === "-" ? 4 : 20 + (i % 3) * 4,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FROM / TO */}
      <div className="grid grid-cols-2 border-b-2 border-black">
        <div className="border-r-2 border-black p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider">From</p>
          <p className="mt-1 text-sm font-bold">{businessName}</p>
          <p className="mt-1 text-xs leading-snug">{businessAddress}</p>
          <p className="mt-1 text-xs font-semibold">{businessArea}, Karachi</p>
          <p className="mt-2 text-[10px] text-slate-600">
            Pickup: {shipment.pickup_address}
          </p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider">To</p>
          <p className="mt-1 text-sm font-bold">{shipment.recipient_name}</p>
          <p className="mt-1 text-xs leading-snug">{shipment.delivery_address}</p>
          <p className="mt-1 text-xs font-semibold">
            {shipment.delivery_area}, Karachi
          </p>
          <p className="mt-2 font-mono text-sm font-bold">
            {shipment.recipient_phone}
          </p>
        </div>
      </div>

      {/* Shipment details */}
      <div className="border-b-2 border-black p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider">
          Shipment Details
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <p>
            <span className="font-semibold">Weight:</span>{" "}
            {shipment.weight_kg ?? 0.5} kg
          </p>
          <p>
            <span className="font-semibold">Payment:</span> {paymentLabel}
          </p>
          {shipment.notes && (
            <p className="col-span-2">
              <span className="font-semibold">Notes:</span> {shipment.notes}
            </p>
          )}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between bg-black px-4 py-2 text-white">
        <p className="font-mono text-xs font-bold tracking-wider">
          {shipment.tracking_number}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide">
          Handle with care
        </p>
        <p className="text-[10px]">karachicourier.pk</p>
      </div>
    </div>
  );
}
