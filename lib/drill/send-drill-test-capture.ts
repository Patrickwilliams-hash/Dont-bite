import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface DrillSendTestCapture {
  deliveryId: string;
  trackingTokenHash: string;
  trackingUrl: string;
  emailHtml: string;
  emailText: string;
  rawTrackingToken: string;
}

const CAPTURE_DIR = path.join(os.tmpdir(), "dontbite-drill-send-capture");

export function isDrillSendTestCaptureEnabled(): boolean {
  return process.env.DRILL_SEND_TEST_CAPTURE === "1";
}

function capturePath(deliveryId: string): string {
  return path.join(CAPTURE_DIR, `${deliveryId}.json`);
}

export async function writeDrillSendTestCapture(
  capture: DrillSendTestCapture
): Promise<void> {
  if (!isDrillSendTestCaptureEnabled()) return;

  await mkdir(CAPTURE_DIR, { recursive: true });
  await writeFile(capturePath(capture.deliveryId), JSON.stringify(capture), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function readDrillSendTestCapture(
  deliveryId: string
): Promise<DrillSendTestCapture | null> {
  try {
    const contents = await readFile(capturePath(deliveryId), "utf8");
    return JSON.parse(contents) as DrillSendTestCapture;
  } catch {
    return null;
  }
}

export async function deleteDrillSendTestCapture(deliveryId: string): Promise<void> {
  try {
    await rm(capturePath(deliveryId), { force: true });
  } catch {
    // Ignore cleanup failures in tests.
  }
}
