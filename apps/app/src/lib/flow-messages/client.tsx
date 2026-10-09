"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { FlowMessages } from "../flow-messages";
const FlowContext = createContext<FlowMessages | null>(null);
export function FlowMessagesProvider({ messages, children }: { messages: FlowMessages; children: ReactNode }) { return <FlowContext.Provider value={messages}>{children}</FlowContext.Provider>; }
export function useFlowMessages() { const value = useContext(FlowContext); if (!value) throw new Error("Flow messages are not available."); return value; }
