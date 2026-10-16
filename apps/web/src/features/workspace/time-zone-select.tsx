import { Select } from "@/components/ui/input";

export function TimeZoneSelect({
  zones,
  ...props
}: React.ComponentProps<typeof Select> & { zones: string[] }) {
  return (
    <Select {...props}>
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </option>
      ))}
    </Select>
  );
}
