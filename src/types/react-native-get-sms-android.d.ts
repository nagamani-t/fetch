declare module 'react-native-get-sms-android' {
  interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft';
    indexFrom?: number;
    maxCount?: number;
    address?: string;
    body?: string;
  }

  interface SmsMessage {
    _id: string;
    address: string;
    body: string;
    date: string;
    read: number;
    status: number;
    type: number;
  }

  const SmsAndroid: {
    list: (
      filter: string,
      failureCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ) => void;
  };

  export default SmsAndroid;
}