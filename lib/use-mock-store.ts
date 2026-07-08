"use client";

import { useSyncExternalStore } from "react";
import { getDefaultStore, loadStore, type MockStore } from "./mock-store";

const SERVER_SNAPSHOT = getDefaultStore();
let clientSnapshot: MockStore | null = null;

function getSnapshot(): MockStore {
  return clientSnapshot ?? SERVER_SNAPSHOT;
}

function getServerSnapshot(): MockStore {
  return SERVER_SNAPSHOT;
}

function subscribe(onStoreChange: () => void) {
  const update = () => {
    clientSnapshot = loadStore();
    onStoreChange();
  };

  update();

  window.addEventListener("phish-store-update", update);
  window.addEventListener("storage", update);

  return () => {
    window.removeEventListener("phish-store-update", update);
    window.removeEventListener("storage", update);
  };
}

export function useMockStore(): MockStore {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useRequireUser(): MockStore & { user: NonNullable<MockStore["user"]> } {
  const store = useMockStore();
  return store as MockStore & { user: NonNullable<MockStore["user"]> };
}
