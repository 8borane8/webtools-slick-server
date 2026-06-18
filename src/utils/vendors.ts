export const VENDOR_PREFIX = "/~vendors/";

export const libToVendorUrl = (lib: string) => VENDOR_PREFIX + lib;
export const vendorUrlToLib = (url: string) => url.slice(VENDOR_PREFIX.length);
