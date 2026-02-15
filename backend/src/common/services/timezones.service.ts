import { Injectable } from "@nestjs/common";

@Injectable()
export class TimezonesService {
  listTimeZones(): { value: string; label: string }[] {
    try {
      // Check if supportedValuesOf is available (Node 18+)
      if (typeof (Intl as any).supportedValuesOf !== "function") {
        return [{ value: "UTC", label: "(GMT+00:00) UTC" }];
      }

      return (Intl as any).supportedValuesOf("timeZone").map((tz) => {
        const offset = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          timeZoneName: "longOffset",
        })
          .formatToParts(new Date())
          .find((part) => part.type === "timeZoneName")?.value;

        return {
          value: tz,
          label: `(${offset}) ${tz}`,
        };
      });
    } catch (error) {
      console.error("Error listing timezones:", error);
      return [{ value: "UTC", label: "(GMT+00:00) UTC" }];
    }
  }
}
