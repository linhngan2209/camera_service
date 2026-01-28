export const convertMessageToHardware = {
  paramToHardware(
    timer: number,
    percent_opening_closing: string,
    time: string,
    sunday: string,
    monday: string,
    tuesday: string,
    wednesday: string,
    thursday: string,
    friday: string,
    saturday: string
  ): string {
    const timeP = time.replace(/:/g, '');

    const convertDay = (day: string) => (day === 'ON' ? '1' : '0');

    const result =
      'T' +
      timer +
      percent_opening_closing +
      timeP +
      convertDay(sunday) +
      convertDay(monday) +
      convertDay(tuesday) +
      convertDay(wednesday) +
      convertDay(thursday) +
      convertDay(friday) +
      convertDay(saturday) +
      '/';

    return result;
  },

  hardwareStatusToHardware(data: string): string {
    const validCommands = ['UP', 'DN', 'ST', 'CF', 'RS', 'CE'];
    if (validCommands.includes(data)) {
      return data + '/';
    }
    throw new Error(`Invalid hardware status: ${data}`);
  },

  hardwareStatusGOToHardware(hardware_status: string, percent_opening_closing: string): string {
    return hardware_status + percent_opening_closing + '/';
  }
};
