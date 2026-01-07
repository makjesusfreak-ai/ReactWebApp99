/**
 * Format seconds into human-readable time string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30m 45s" or "45s"
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || seconds === 0) {
    return '0s';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

/**
 * Parse human-readable duration string to seconds
 * @param durationStr - String like "2h 30m" or "45s"
 * @returns Duration in seconds
 */
export function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;

  // If it's just a number, assume it's already in seconds
  if (/^\d+$/.test(durationStr.trim())) {
    return parseInt(durationStr.trim(), 10);
  }

  let totalSeconds = 0;

  // Match days
  const daysMatch = durationStr.match(/(\d+)\s*d/i);
  if (daysMatch) {
    totalSeconds += parseInt(daysMatch[1], 10) * 86400;
  }

  // Match hours
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }

  // Match minutes
  const minutesMatch = durationStr.match(/(\d+)\s*m(?!s)/i);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  // Match seconds
  const secondsMatch = durationStr.match(/(\d+)\s*s/i);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10);
  }

  return totalSeconds;
}

/**
 * Format duration for display in AG-Grid
 * Shows both human-readable and raw seconds on hover
 */
export function formatDurationWithTooltip(seconds: number | undefined | null): {
  display: string;
  tooltip: string;
} {
  const display = formatDuration(seconds);
  const tooltip = `${seconds || 0} seconds`;
  return { display, tooltip };
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return '0%';
  }
  return `${Math.round(value)}%`;
}

/**
 * Format a number with bounds checking for 0-100 range
 */
export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Generate a severity color based on value (0-100)
 * Green (low) -> Yellow (medium) -> Red (high)
 */
export function getSeverityColor(severity: number): string {
  const clampedSeverity = clampPercentage(severity);
  
  if (clampedSeverity < 33) {
    return '#4ade80'; // Green
  } else if (clampedSeverity < 66) {
    return '#facc15'; // Yellow
  } else {
    return '#f87171'; // Red
  }
}

/**
 * Generate an intensity color based on value (0-100)
 * Light blue (low) -> Blue (medium) -> Dark blue (high)
 */
export function getIntensityColor(intensity: number): string {
  const clampedIntensity = clampPercentage(intensity);
  
  if (clampedIntensity < 33) {
    return '#93c5fd'; // Light blue
  } else if (clampedIntensity < 66) {
    return '#3b82f6'; // Blue
  } else {
    return '#1d4ed8'; // Dark blue
  }
}

/**
 * Generate an efficacy color based on value (0-100)
 * Red (low) -> Yellow (medium) -> Green (high)
 */
export function getEfficacyColor(efficacy: number): string {
  const clampedEfficacy = clampPercentage(efficacy);
  
  if (clampedEfficacy < 33) {
    return '#f87171'; // Red
  } else if (clampedEfficacy < 66) {
    return '#facc15'; // Yellow
  } else {
    return '#4ade80'; // Green
  }
}
