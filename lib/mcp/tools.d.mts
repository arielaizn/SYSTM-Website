import type { z } from 'zod';

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  kind: 'read' | 'write' | 'destructive' | 'local';
  publish?: boolean;
  noConfig?: boolean;
  noLog?: boolean;
  input: Record<string, z.ZodTypeAny>;
  run: (args: any, ctx: any) => Promise<unknown>;
  preview?: (args: any, ctx: any) => Promise<string>;
  target?: (args: any) => string;
};

export function buildTools(): ToolDef[];
