function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIcsUtc(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function fold(line: string) {
  return line.replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export function buildCallIcs(input: {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const stamp = toIcsUtc(new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Linkerbuddy//Strategy Call//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@linkerbuddy.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(input.startsAt)}`,
    `DTEND:${toIcsUtc(input.endsAt)}`,
    `SUMMARY:${fold(input.title)}`,
    `DESCRIPTION:${fold(input.description)}`,
    `LOCATION:${fold(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
