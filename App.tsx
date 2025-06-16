/* eslint-disable prettier/prettier */
import * as React from 'react';
import {
  PermissionsAndroid,
  Button,
  Platform,
  ScrollView,
  Text,
  View,
  Alert,
  StyleSheet,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';

interface SMSMessage {
  address: string;
  body: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  payload: {
    headers: GmailHeader[];
  };
  snippet: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = React.useState<string[]>([]);
  const [emails, setEmails] = React.useState<EmailMessage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    GoogleSignin.configure({
      iosClientId: '388389586816-d7t4gvu1gpj7j5ogu70viisiitk5imdf.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly']
    });
  }, []);

  const requestSMSPermissionAndFetch = async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      Alert.alert('Unsupported', 'SMS reading is not available on iOS devices');
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'This app needs permission to read your SMS messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        fetchSMS();
      } else {
        Alert.alert(
          'Permission Denied',
          'SMS permission is required to read messages',
        );
      }
    } catch (err: unknown) {
      console.error('Permission request error:', err);
      Alert.alert('Error', 'Failed to request SMS permission');
    }
  };

  const fetchSMS = (): void => {
    try {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          maxCount: 100,
        }),
        (fail: string) => {
          console.error('Failed to fetch SMS:', fail);
          Alert.alert('Error', 'Failed to fetch SMS messages');
        },
        (count: number, smsList: string) => {
          try {
            const messagesArray: SMSMessage[] = JSON.parse(smsList);
            const formattedMessages = messagesArray.map(
              (sms: SMSMessage) =>
                `From: ${sms.address}\nMessage: ${sms.body}`,
            );
            setMessages(formattedMessages);
          } catch (error) {
            console.error('Error parsing SMS:', error);
            Alert.alert('Error', 'Failed to parse SMS messages');
          }
        },
      );
    } catch (error: unknown) {
      console.error('Error in fetchSMS:', error);
      Alert.alert('Error', 'Failed to fetch SMS messages');
    }
  };

  const fetchEmails = async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Note', 'Email fetching is configured for iOS devices');
      return;
    }

    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();

      const response = await axios.get<{ messages: { id: string }[] }>(
        'https://www.googleapis.com/gmail/v1/users/me/messages',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { maxResults: 10 }
        }
      );

      const emailPromises = response.data.messages.map(async (msg) => {
        const messageDetail = await axios.get<GmailMessageResponse>(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        const headers = messageDetail.data.payload.headers;
        return {
          id: msg.id,
          subject: headers.find((h) => h.name === 'Subject')?.value || 'No Subject',
          from: headers.find((h) => h.name === 'From')?.value || 'Unknown',
          snippet: messageDetail.data.snippet
        };
      });

      const emailMessages = await Promise.all(emailPromises);
      setEmails(emailMessages);
    } catch (error) {
      console.error('Error fetching emails:', error);
      Alert.alert('Error', 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {Platform.OS === 'android' && (
          <Button
            title="Fetch SMS Messages"
            onPress={requestSMSPermissionAndFetch}
          />
        )}
        {Platform.OS === 'ios' && (
          <Button
            title="Fetch Emails"
            onPress={fetchEmails}
            disabled={loading}
          />
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {Platform.OS === 'android' ? (
          // Existing SMS messages view
          messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet.</Text>
          ) : (
            messages.map((msg, idx) => (
              <View key={idx} style={styles.messageCard}>
                <Text>{msg}</Text>
              </View>
            ))
          )
        ) : (emails.length === 0 ? (
            <Text style={styles.emptyText}>No emails yet.</Text>
          ) : (
    emails.map(email => (
        <View key={email.id} style={styles.emailCard}>
        <Text style={styles.emailSubject}>{email.subject}</Text>
         <Text style={styles.emailFrom}>{email.from}</Text>
                <Text style={styles.emailSnippet}>{email.snippet}</Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  messageCard: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  emailCard: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emailFrom: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emailSnippet: {
    marginTop: 8,
  },
});

export default App;
