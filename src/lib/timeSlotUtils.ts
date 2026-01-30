/**
 * Business hours configuration for time slot generation
 */
export interface BusinessHoursConfig {
  openingTime: string | null | undefined;
  closingTime: string | null | undefined;
  prepBufferMinutes?: number;
  cleanupBufferMinutes?: number;
  slotIntervalMinutes?: number;
}

/**
 * Parses a time string (HH:mm) to minutes of day
 */
function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(':');
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);

  if (
    isNaN(hours) || isNaN(mins) ||
    hours < 0 || hours > 23 ||
    mins < 0 || mins > 59
  ) {
    return null;
  }

  return hours * 60 + mins;
}

/**
 * Converts minutes of day to HH:mm string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generates time slots based on business hours with buffer support.
 * 
 * The schedulable window is:
 * - Start: opening_time + prep_buffer_minutes
 * - End: closing_time - cleanup_buffer_minutes
 * 
 * @param config - Business hours configuration
 * @returns Array of time strings ["08:20", "08:30", ...]
 */
export function generateBusinessTimeSlots(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  intervalMinutes: number = 30,
  prepBufferMinutes: number = 0,
  cleanupBufferMinutes: number = 0
): string[] {
  const slots: string[] = [];

  // Validate inputs
  if (!openingTime || !closingTime) {
    return slots;
  }

  const openingMinutes = parseTimeToMinutes(openingTime);
  const closingMinutes = parseTimeToMinutes(closingTime);

  if (openingMinutes === null || closingMinutes === null) {
    return slots;
  }

  // Calculate schedulable window with buffers
  const scheduleStart = openingMinutes + (prepBufferMinutes || 0);
  const scheduleEnd = closingMinutes - (cleanupBufferMinutes || 0);

  // Validate window
  if (scheduleStart >= scheduleEnd) {
    return slots;
  }

  // Ensure interval is valid
  const interval = intervalMinutes > 0 ? intervalMinutes : 30;

  // Round scheduleStart up to the next interval if needed
  const roundedStart = Math.ceil(scheduleStart / interval) * interval;

  // Generate slots from roundedStart to scheduleEnd
  // Last slot must START at or before scheduleEnd - we'll handle service duration later
  for (let currentMinutes = roundedStart; currentMinutes <= scheduleEnd; currentMinutes += interval) {
    slots.push(minutesToTime(currentMinutes));
  }

  return slots;
}

/**
 * Checks if business hours are properly configured
 */
export function isBusinessHoursConfigured(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined
): boolean {
  if (!openingTime || !closingTime) {
    return false;
  }

  const openingMinutes = parseTimeToMinutes(openingTime);
  const closingMinutes = parseTimeToMinutes(closingTime);

  if (openingMinutes === null || closingMinutes === null) {
    return false;
  }

  return openingMinutes < closingMinutes;
}

/**
 * Filters out occupied time slots based on existing appointments
 * and ensures the service fits within the schedulable window.
 * 
 * @param allSlots - All possible time slots
 * @param existingAppointments - Array of existing appointments with time and duration
 * @param serviceDuration - Duration of the service being booked
 * @param scheduleEndMinutes - End of the schedulable window (closing - cleanup buffer)
 * @returns Filtered array of available time slots
 */
export function filterAvailableSlots(
  allSlots: string[],
  existingAppointments: Array<{ appointment_time: string; duration: number }>,
  serviceDuration: number,
  closingTime: string | null | undefined,
  cleanupBufferMinutes: number = 0
): string[] {
  if (!closingTime) return allSlots;

  const closingMinutes = parseTimeToMinutes(closingTime);
  if (closingMinutes === null) return allSlots;

  // Calculate the schedulable end (closing - cleanup buffer)
  const scheduleEndMinutes = closingMinutes - cleanupBufferMinutes;

  // Build occupied ranges
  const occupiedSlots: { start: number; end: number }[] = existingAppointments.map(apt => {
    const startMinutes = parseTimeToMinutes(apt.appointment_time);
    if (startMinutes === null) return { start: 0, end: 0 };
    return { start: startMinutes, end: startMinutes + apt.duration };
  }).filter(slot => slot.start !== 0 || slot.end !== 0);

  return allSlots.filter(slot => {
    const slotStart = parseTimeToMinutes(slot);
    if (slotStart === null) return false;

    const slotEnd = slotStart + serviceDuration;

    // Check if service would end after the schedulable window
    if (slotEnd > scheduleEndMinutes) {
      return false;
    }

    // Check for conflicts with existing appointments
    const hasConflict = occupiedSlots.some(occupied =>
      slotStart < occupied.end && slotEnd > occupied.start
    );

    return !hasConflict;
  });
}

/**
 * Calculates the schedulable window for a business
 */
export function getSchedulableWindow(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  prepBufferMinutes: number = 0,
  cleanupBufferMinutes: number = 0
): { start: string; end: string } | null {
  if (!openingTime || !closingTime) return null;

  const openingMinutes = parseTimeToMinutes(openingTime);
  const closingMinutes = parseTimeToMinutes(closingTime);

  if (openingMinutes === null || closingMinutes === null) return null;

  const scheduleStart = openingMinutes + prepBufferMinutes;
  const scheduleEnd = closingMinutes - cleanupBufferMinutes;

  if (scheduleStart >= scheduleEnd) return null;

  return {
    start: minutesToTime(scheduleStart),
    end: minutesToTime(scheduleEnd)
  };
}
