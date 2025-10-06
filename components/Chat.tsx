import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  ActionSheetIOS,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { decode } from 'base64-arraybuffer';
import { RealtimeChannel, supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/types/database';
import ChatMessage from './ChatMessage';
import ImagePreview from './ImagePreview';
import ReactionPicker from './ReactionPicker';
import { Send, Paperclip, Mic, Trash2, X, Check } from 'lucide-react-native';

type Message = Tables<'messages'>;

type MessageWithReply = Message & {
  message_reactions: { emoji: string; user_id: string }[];
  replied_to: (Message & { sender_name: string }) | null;
};

interface ChatProps {
  conversationId: string;
}

const Chat: React.FC<ChatProps> = ({ conversationId }) => {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<MessageWithReply[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, stopping
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [otherUserIsTyping, setOtherUserIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactingTo, setReactingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Mark incoming messages as read
    const markAsRead = async () => {
      if (!profile) return;
      // This RPC needs to be updated if you want read receipts in group chats.
      // For now, we'll assume it's for DMs or we can disable it.
    };

    const fetchMessages = async () => {
      // We join the message with itself to get the replied-to message's content and sender name.
      let { data, error } = await supabase
        .from('messages')
        .select('*, message_reactions ( emoji, user_id ), replied_to:messages!reply_to_message_id(content, image_url, audio_url, sender:profiles!sender_id(full_name))')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) console.error('Error fetching messages:', error);
      else if (data) { 
        // Create signed URLs for images
        for (const message of data) {
          if (message.image_url) {
            const { data: signedUrlData } = await supabase.storage.from('chat_images').createSignedUrl(message.image_url, 60 * 60); // 1 hour expiry
            message.image_url = signedUrlData?.signedUrl || null;
          }
          if (message.audio_url) {
            const { data: signedUrlData } = await supabase.storage.from('chat_audio').createSignedUrl(message.audio_url, 60 * 60);
            message.audio_url = signedUrlData?.signedUrl || null;
          }
      }
      // @ts-ignore - The joined data needs to be flattened for easier use.
      const formattedData = data?.map(message => {
        if (message.replied_to) {
          return {
            ...message,
            replied_to: {
              ...message.replied_to,
              sender_name: message.replied_to.sender.full_name,
            }
          }
        }
        return message;
      }) || [];
      setMessages(formattedData);
      
      markAsRead(); // Mark existing messages as read after fetching
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${conversationId}`, {
        config: {
          broadcast: {
            self: false, // We don't want to receive our own typing events
          },
        },
      });
    channelRef.current = channel;

    // Listen for typing indicators
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      setOtherUserIsTyping(payload.payload.isTyping);
    });

    // Listen for database changes
    channel
      .on(
        'postgres_changes', // This should be one listener for the table
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // In a real-world scenario, you'd fetch the new message with the join
            // to get reply context, or handle it client-side.
            // For simplicity, we add it directly.
            const newMessage = { ...payload.new, message_reactions: [] } as MessageWithReply;
            setMessages((prevMessages) => [...prevMessages, newMessage]); // This might cause duplicates if you refetch
            markAsRead(); // Mark new message as read immediately if chat is open
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          // This is a simplified handler. A full implementation would fetch the message
          // again or update the reaction count more granularly.
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            // For simplicity, we'll just refetch the messages to update reactions.
            // A more optimized approach would be to update the specific message's reactions in state.
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [conversationId]);

  const handleShowActions = (message: Message) => {
    const isMyMessage = message.sender_id === profile?.id;
    // Editing is only allowed for text-only messages sent by the current user.
    const canEdit = isMyMessage && message.content && !message.image_url && !message.audio_url;
    const canDelete = isMyMessage;

    const options = ['Cancel', 'Reply', 'React'];
    if (canEdit) {
      options.push('Edit');
    }
    if (canDelete) {
      options.push('Delete');
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        const selectedOption = options[buttonIndex];
        if (selectedOption === 'Reply') {
          setReplyingTo(message);
        } else if (selectedOption === 'React') {
          setReactingTo(message);
        } else if (selectedOption === 'Edit') {
          setEditingMessage(message);
          setNewMessage(message.content || ''); // Pre-fill the input
          setReplyingTo(null); // Can't edit and reply at the same time
        } else if (selectedOption === 'Delete') {
          handleDeleteMessage(message.id);
        }
      }
    );
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!reactingTo) return;
    await supabase.rpc('toggle_reaction', {
      p_message_id: reactingTo.id,
      p_emoji: emoji,
    });
    setReactingTo(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
        }},
      ]
    );
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !profile || isUploading) return;

    if (editingMessage) {
      // We are in editing mode
      const { error } = await supabase
        .from('messages')
        .update({ content: content, updated_at: new Date().toISOString() })
        .eq('id', editingMessage.id);

      if (error) {
        console.error('Error updating message:', error);
      }
      setEditingMessage(null);
    } else {
      // We are sending a new message
      const messageToSend = {
        conversation_id: conversationId,
        sender_id: profile.id,
        content: content,
        reply_to_message_id: replyingTo ? replyingTo.id : null,
      };
      const { error } = await supabase.from('messages').insert(messageToSend);
      if (error) console.error('Error sending message:', error);
    }

    // Reset state
    setNewMessage('');
    setReplyingTo(null);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (channelRef.current) {
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Broadcast that we are typing
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { isTyping: true } });

      // Set a timeout to broadcast that we've stopped typing
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { isTyping: false } });
      }, 2000); // 2 seconds
    }
  };

  const handlePickImage = async () => {
    if (!profile) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true, // We'll use base64 to upload
    });

    if (!result.canceled && result.assets[0].base64) {
      setIsUploading(true);
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filePath = `${conversationId}/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_images')
        .upload(filePath, decode(asset.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        setIsUploading(false);
        return;
      }

      // Send a message with the image URL
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        image_url: filePath,
        // Note: Editing is disabled for image messages, so no need to check editingMessage
        reply_to_message_id: replyingTo ? replyingTo.id : null,
      });

      if (messageError) console.error('Error sending image message:', messageError);
      setIsUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need microphone permissions to make this work!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setRecordingStatus('recording');

      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopRecording = async (send: boolean) => {
    if (!recording) return;

    setRecordingStatus('stopping');
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (send && uri && profile) {
        setIsUploading(true);
        const response = await fetch(uri);
        const blob = await response.blob();

        const filePath = `${conversationId}/${profile.id}/${Date.now()}.m4a`;

        const { error: uploadError } = await supabase.storage
          .from('chat_audio')
          .upload(filePath, blob, {
            contentType: 'audio/m4a',
          });

        if (uploadError) throw uploadError;

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          audio_url: filePath,
          audio_duration_seconds: recordingDuration,
          // Note: Editing is disabled for audio messages
          reply_to_message_id: replyingTo ? replyingTo.id : null,
        });

        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error with recording:', error);
      setIsUploading(false);
    } finally {
      // Clear reply state if a voice message is sent
      setReplyingTo(null);
      setRecording(null);
      setRecordingDuration(0);
      setRecordingStatus('idle');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderInputContent = () => {
    if (recordingStatus === 'recording' || recordingStatus === 'stopping') {
      return (
        <View style={styles.recordingContainer}>
          <TouchableOpacity onPress={() => handleStopRecording(false)} disabled={recordingStatus === 'stopping'}>
            <Trash2 size={24} color={colors.error} />
          </TouchableOpacity>
          <Text style={styles.recordingText}>{formatRecordingTime(recordingDuration)}</Text>
          <TouchableOpacity style={styles.sendButton} onPress={() => handleStopRecording(true)} disabled={recordingStatus === 'stopping'}>
            <Send size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      );
    }
    return null; // The rest of the input is handled outside
  };

  const styles = getStyles(colors);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  }

  return (
    <View style={styles.container}>
      <ImagePreview
        visible={!!previewImageUrl}
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
      <ReactionPicker
        isVisible={!!reactingTo}
        onClose={() => setReactingTo(null)}
        onSelect={handleSelectReaction}
      />
      <FlatList
        ListFooterComponent={
          otherUserIsTyping ? (
            <Text style={styles.typingIndicator}>typing...</Text>
          ) : null
        }
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isCurrentUser={item.sender_id === profile?.id}
            onImagePress={setPreviewImageUrl}
            onShowActions={handleShowActions}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {editingMessage && (
        <View style={styles.editingContainer}>
          <View style={styles.replyingToContent}>
            <Text style={styles.replyingToTitle}>Editing Message</Text>
            <Text style={styles.replyingToMessage} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingMessage(null); setNewMessage(''); }}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      {replyingTo && (
        <View style={styles.replyingToContainer}>
          <View style={styles.replyingToContent}>
            <Text style={styles.replyingToTitle}>
              Replying to {replyingTo.sender_id === profile?.id ? 'yourself' : '...'}
            </Text>
            <Text style={styles.replyingToMessage} numberOfLines={1}>
              {replyingTo.content
                ? replyingTo.content
                : replyingTo.image_url
                ? 'Photo'
                : 'Voice message'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputContainer}>
        {recordingStatus !== 'idle' ? renderInputContent() : (
          <>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} disabled={isUploading}>
              {isUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Paperclip size={24} color={colors.textSecondary} />}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={handleTyping}
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              placeholderTextColor={colors.textSecondary}
              editable={!isUploading}
            />
            {newMessage.trim().length > 0 && !editingMessage ? (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Send size={24} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton} onPressIn={handleStartRecording} onPressOut={() => handleStopRecording(true)}>
                <Mic size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {editingMessage && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Check size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    messageList: { padding: 16 },
    typingIndicator: {
      marginLeft: 16,
      marginBottom: 16,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    replyingToContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    editingContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    replyingToContent: {
      flex: 1,
    },
    replyingToTitle: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 13,
    },
    replyingToMessage: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
      gap: 12,
    },
    recordingContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    recordingText: {
      fontSize: 16,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
    },
    attachButton: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micButton: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 24,
    },
  });

export default Chat;
            markAsRead(); // Mark new message as read immediately if chat is open
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [orderId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile || isUploading) return;

    const messageToSend = {
      order_id: orderId,
      sender_id: profile.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
      reply_to_message_id: replyingTo ? replyingTo.id : null,
    };

    setNewMessage('');
    setReplyingTo(null);
    const { error } = await supabase.from('messages').insert(messageToSend);
    if (error) console.error('Error sending message:', error);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (channelRef.current) {
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Broadcast that we are typing
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { isTyping: true } });

      // Set a timeout to broadcast that we've stopped typing
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { isTyping: false } });
      }, 2000); // 2 seconds
    }
  };

  const handlePickImage = async () => {
    if (!profile) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true, // We'll use base64 to upload
    });

    if (!result.canceled && result.assets[0].base64) {
      setIsUploading(true);
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filePath = `${orderId}/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_images')
        .upload(filePath, decode(asset.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        setIsUploading(false);
        return;
      }

      // Send a message with the image URL
      const { error: messageError } = await supabase.from('messages').insert({
        order_id: orderId,
        sender_id: profile.id,
        receiver_id: receiverId,
        image_url: filePath,
        reply_to_message_id: replyingTo ? replyingTo.id : null,
      });

      if (messageError) console.error('Error sending image message:', messageError);
      setIsUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need microphone permissions to make this work!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setRecordingStatus('recording');

      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopRecording = async (send: boolean) => {
    if (!recording) return;

    setRecordingStatus('stopping');
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (send && uri && profile) {
        setIsUploading(true);
        const response = await fetch(uri);
        const blob = await response.blob();

        const filePath = `${orderId}/${profile.id}/${Date.now()}.m4a`;

        const { error: uploadError } = await supabase.storage
          .from('chat_audio')
          .upload(filePath, blob, {
            contentType: 'audio/m4a',
          });

        if (uploadError) throw uploadError;

        await supabase.from('messages').insert({
          order_id: orderId,
          sender_id: profile.id,
          receiver_id: receiverId,
          audio_url: filePath,
          audio_duration_seconds: recordingDuration,
          reply_to_message_id: replyingTo ? replyingTo.id : null,
        });

        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error with recording:', error);
      setIsUploading(false);
    } finally {
      setReplyingTo(null);
      setRecording(null);
      setRecordingDuration(0);
      setRecordingStatus('idle');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderInputContent = () => {
    if (recordingStatus === 'recording' || recordingStatus === 'stopping') {
      return (
        <View style={styles.recordingContainer}>
          <TouchableOpacity onPress={() => handleStopRecording(false)} disabled={recordingStatus === 'stopping'}>
            <Trash2 size={24} color={colors.error} />
          </TouchableOpacity>
          <Text style={styles.recordingText}>{formatRecordingTime(recordingDuration)}</Text>
          <TouchableOpacity style={styles.sendButton} onPress={() => handleStopRecording(true)} disabled={recordingStatus === 'stopping'}>
            <Send size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      );
    }
    return null; // The rest of the input is handled outside
  };

  const styles = getStyles(colors);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  }

  return (
    <View style={styles.container}>
      <ImagePreview
        visible={!!previewImageUrl}
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
      <FlatList
        ListFooterComponent={
          otherUserIsTyping ? (
            <Text style={styles.typingIndicator}>typing...</Text>
          ) : null
        }
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isCurrentUser={item.sender_id === profile?.id}
            onImagePress={setPreviewImageUrl}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} disabled={isUploading}>
          {isUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Paperclip size={24} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          editable={!isUploading}
        />
        {newMessage.trim().length > 0 && (
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Send size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    messageList: { padding: 16 },
    typingIndicator: {
      marginLeft: 16,
      marginBottom: 16,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    replyingToContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    replyingToContent: {
      flex: 1,
    },
    replyingToTitle: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 13,
    },
    replyingToMessage: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
      gap: 12,
    },
    recordingContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    recordingText: {
      fontSize: 16,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
    },
    attachButton: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micButton: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 24,
    },
  });

export default Chat;