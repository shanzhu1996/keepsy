"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TimePickerInput({
  value,
  onChange,
}: TimePickerInputProps) {
  // Parse the value (format: "HH:mm")
  const [hour, setHour] = useState(
    value ? value.split(":")[0] : "09"
  );
  const [minute, setMinute] = useState(
    value ? value.split(":")[1] : "00"
  );
  const [customMinute, setCustomMinute] = useState("");

  const handleHourChange = (h: string) => {
    setHour(h);
    const m = customMinute || minute;
    onChange(`${h}:${m}`);
  };

  const handleMinuteChange = (m: string) => {
    if (m === "custom") {
      setMinute(customMinute || "00");
      onChange(`${hour}:${customMinute || "00"}`);
    } else {
      setMinute(m);
      setCustomMinute("");
      onChange(`${hour}:${m}`);
    }
  };

  const handleCustomMinute = (val: string) => {
    setCustomMinute(val);
    onChange(`${hour}:${val || "00"}`);
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-sm font-medium block mb-1">Hour</label>
        <Select value={hour} onValueChange={handleHourChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => {
              const h = String(i).padStart(2, "0");
              return (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium block mb-1">Minute</label>
        <Select
          value={customMinute ? "custom" : minute}
          onValueChange={handleMinuteChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="00">:00</SelectItem>
            <SelectItem value="30">:30</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(customMinute || minute === "custom") && (
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Custom</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={customMinute}
            onChange={(e) => handleCustomMinute(e.target.value)}
            placeholder="00"
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
