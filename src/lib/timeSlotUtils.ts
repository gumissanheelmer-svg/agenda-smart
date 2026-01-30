/**
 * Generates time slots based on opening and closing times.
 * Uses only minutes-of-day calculations to avoid timezone issues.
 * 
 * @param openingTime - Opening time in "HH:mm" format
 * @param closingTime - Closing time in "HH:mm" format
 * @param intervalMinutes - Interval between slots (default 30)
 * @returns Array of time strings ["08:00", "08:30", ...]
 */
export function generateBusinessTimeSlots(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];

  // Validate inputs
  if (!openingTime || !closingTime) {
    return slots;
  }

  // Parse times safely
  const openingParts = openingTime.split(':');
  const closingParts = closingTime.split(':');

  if (openingParts.length < 2 || closingParts.length < 2) {
    return slots;
  }

  const openHour = parseInt(openingParts[0], 10);
  const openMin = parseInt(openingParts[1], 10);
  const closeHour = parseInt(closingParts[0], 10);
  const closeMin = parseInt(closingParts[1], 10);

  // Validate parsed values
  if (
    isNaN(openHour) || isNaN(openMin) ||
    isNaN(closeHour) || isNaN(closeMin) ||
    openHour < 0 || openHour > 23 ||
    closeHour < 0 || closeHour > 23 ||
    openMin < 0 || openMin > 59 ||
    closeMin < 0 || closeMin > 59
  ) {
    return slots;
  }

  // Convert to minutes of day
  const openingMinutes = openHour * 60 + openMin;
  const closingMinutes = closeHour * 60 + closeMin;

  // Opening must be before closing
  if (openingMinutes >= closingMinutes) {
    return slots;
  }

  // Last slot start must be at least intervalMinutes before closing
  const lastSlotStart = closingMinutes - intervalMinutes;

  // Generate slots
  for (let currentMinutes = openingMinutes; currentMinutes <= lastSlotStart; currentMinutes += intervalMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(timeStr);
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

  const openingParts = openingTime.split(':');
  const closingParts = closingTime.split(':');

  if (openingParts.length < 2 || closingParts.length < 2) {
    return false;
  }

  const openHour = parseInt(openingParts[0], 10);
  const openMin = parseInt(openingParts[1], 10);
  const closeHour = parseInt(closingParts[0], 10);
  const closeMin = parseInt(closingParts[1], 10);

  if (
    isNaN(openHour) || isNaN(openMin) ||
    isNaN(closeHour) || isNaN(closeMin)
  ) {
    return false;
  }

  const openingMinutes = openHour * 60 + openMin;
  const closingMinutes = closeHour * 60 + closeMin;

  return openingMinutes < closingMinutes;
}

/**
 * Filters out occupied time slots based on existing appointments
 * 
 * @param allSlots - All possible time slots
 * @param existingAppointments - Array of existing appointments with time and duration
 * @param serviceDuration - Duration of the service being booked
 * @param closingTime - Business closing time
 * @returns Filtered array of available time slots
 */
export function filterAvailableSlots(
  allSlots: string[],
  existingAppointments: Array<{ appointment_time: string; duration: number }>,
  serviceDuration: number,
  closingTime: string | null | undefined
): string[] {
  if (!closingTime) return allSlots;

  const closeParts = closingTime.split(':');
  if (closeParts.length < 2) return allSlots;
  
  const closeHour = parseInt(closeParts[0], 10);
  const closeMin = parseInt(closeParts[1], 10);
  const closingMinutes = closeHour * 60 + closeMin;

  // Build occupied ranges
  const occupiedSlots: { start: number; end: number }[] = existingAppointments.map(apt => {
    const [h, m] = apt.appointment_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    return { start: startMinutes, end: startMinutes + apt.duration };
  });

  return allSlots.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + serviceDuration;

    // Check if slot ends after closing
    if (slotEnd > closingMinutes) {
      return false;
    }

    // Check for conflicts with existing appointments
    const hasConflict = occupiedSlots.some(occupied =>
      slotStart < occupied.end && slotEnd > occupied.start
    );

    return !hasConflict;
  });
}
