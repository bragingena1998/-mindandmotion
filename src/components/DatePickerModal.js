import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DatePickerModal = ({ visible, onClose, onSelect, initialDate }) => {
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date();
  };
  const [selectedDate, setSelectedDate] = useState(parseDate(initialDate));

  useEffect(() => {
    if (!visible) return;
    setSelectedDate(parseDate(initialDate));
  }, [visible, initialDate]);

  const handleSave = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    onSelect(dateStr);
    onClose();
  };

  if (!visible) return null;

  return (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display={Platform.OS === 'android' ? 'calendar' : 'default'}
      onChange={(event, date) => {
        if (event?.type === 'dismissed') {
          onClose();
          return;
        }
        if (date) {
          setSelectedDate(date);
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          onSelect(`${y}-${m}-${d}`);
        }
        onClose();
      }}
      maximumDate={new Date()}
    />
  );
};

export default DatePickerModal;
