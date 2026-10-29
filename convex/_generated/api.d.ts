/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as content from "../content.js";
import type * as faqs from "../faqs.js";
import type * as leads from "../leads.js";
import type * as lib from "../lib.js";
import type * as push from "../push.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";
import type * as system from "../system.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  content: typeof content;
  faqs: typeof faqs;
  leads: typeof leads;
  lib: typeof lib;
  push: typeof push;
  services: typeof services;
  settings: typeof settings;
  system: typeof system;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
