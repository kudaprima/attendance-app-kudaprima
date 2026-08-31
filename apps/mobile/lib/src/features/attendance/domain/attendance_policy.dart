enum AttendanceLocationType { office, field }

abstract final class AttendancePolicy {
  static bool isWorkingDay(DateTime localTime) =>
      localTime.weekday >= DateTime.monday &&
      localTime.weekday <= DateTime.friday;

  static bool isCheckInOpen(DateTime localTime) {
    final opening = DateTime(localTime.year, localTime.month, localTime.day, 7);
    return !localTime.isBefore(opening);
  }

  static bool isLate(DateTime localTime) {
    final toleranceEnd = DateTime(
      localTime.year,
      localTime.month,
      localTime.day,
      8,
      15,
    );
    return isWorkingDay(localTime) && localTime.isAfter(toleranceEnd);
  }

  static bool isEarlyCheckout(DateTime localTime) {
    final workEnd = DateTime(
      localTime.year,
      localTime.month,
      localTime.day,
      17,
    );
    return isWorkingDay(localTime) && localTime.isBefore(workEnd);
  }

  static bool canStartOvertime(DateTime localTime) {
    if (!isWorkingDay(localTime)) return true;
    final earliest = DateTime(
      localTime.year,
      localTime.month,
      localTime.day,
      17,
      1,
    );
    return !localTime.isBefore(earliest);
  }

  static bool requiresNote(AttendanceLocationType locationType) =>
      locationType == AttendanceLocationType.field;
}
