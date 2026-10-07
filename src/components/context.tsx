"use client";
import { createContext, useContext, Dispatch, SetStateAction } from "react";
import type { State, RecordRow, Branch } from "@/lib/store";
export type AppContextType = {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  branch: string;
  currency: string;
  role: string;
  scope: (rows: RecordRow[]) => RecordRow[];
  go: (path: string) => void;
  notify: (message: string) => void;
  create: (type: string, record?: RecordRow) => void;
  detail: (type: string, record: RecordRow) => void;
  activeBranch: Branch;
};
export const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);
