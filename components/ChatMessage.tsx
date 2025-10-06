import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Check, CheckCheck, Ban } from 'lucide-react-native';
import { Tables } from '@/types/database';
import AudioPlayer from './AudioPlayer';

type Message = Tables<'messages'>;

// The message type will now potentially have the replied-to message nested.
type MessageWithReply = Message & {
  message_reactions: { emoji: string; user_id: string }[];
  replied_to: (Message & { sender_name: string }) | null;
};

interface ChatMessageProps {
  message: MessageWithReply;
  isCurrentUser: boolean;
  onImagePress: (imageUrl: string) => void;
  onShowActions: (message: Message) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isCurrentUser,
  onImagePress,
  onShowActions,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors, isCurrentUser);

  // If message is deleted, show a placeholder.
  if (message.deleted_at) {
    return (
      <View style={[styles.messageRow, isCurrentUser ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.messageBubble, styles.deletedBubble]}>
          <Ban size={14} color={isCurrentUser ? '#ffffff99' : colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      onLongPress={() => onShowActions(message)}
      style={[styles.messageRow, isCurrentUser ? styles.messageRowRight : styles.messageRowLeft]}
    >
      <View style={[styles.messageBubble, isCurrentUser ? styles.bubbleRight : styles.bubbleLeft]}>
        {message.replied_to && (
          <View style={styles.replyContainer}>
            <Text style={styles.replySenderName}>
              {message.replied_to.sender_name}
            </Text>
            <Text style={styles.replyContent} numberOfLines={1}>
              {message.replied_to.content
                ? message.replied_to.content
                : message.replied_to.image_url
                ? 'Photo'
                : message.replied_to.audio_url
                ? 'Voice message'
                : '...'}
            </Text>
          </View>
        )}
        {message.audio_url && (
          <AudioPlayer
            uri={message.audio_url}
            duration={message.audio_duration_seconds || 0}
          />
        )}
        {message.image_url && (
          <TouchableOpacity onPress={() => onImagePress(message.image_url!)}>
            <Image
              source={{ uri: message.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        {message.content && (
          <Text style={[
            isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
            message.image_url ? { marginTop: 8 } : {}
          ]}>
            {message.content}
          </Text>
        )}
        <Text style={styles.timeText}>
          {message.updated_at && (
            <Text style={styles.editedText}>(edited) </Text>
          )}
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCurrentUser && (
            message.read_at
              ? <CheckCheck size={16} color="#ffffff" style={styles.readReceipt} />
              : <Check size={16} color="#ffffff" style={styles.readReceipt} />
          )}
        </Text>
        {message.message_reactions && message.message_reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
            {message.message_reactions.map(({ emoji, user_id }) => (
              <View key={user_id} style={styles.reaction}>
                <Text>{emoji}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const getStyles = (colors: any, isCurrentUser: boolean) =>
  StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      marginVertical: 4,
    },
    messageRowLeft: {
      justifyContent: 'flex-start',
    },
    messageRowRight: {
      justifyContent: 'flex-end',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
      maxWidth: '75%',
    },
    bubbleLeft: { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
    bubbleRight: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
    messageTextLeft: { color: colors.text, fontSize: 15 },
    deletedBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    deletedText: {
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    messageTextRight: { color: '#ffffff', fontSize: 15 },
    replyContainer: {
      backgroundColor: isCurrentUser ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    replySenderName: {
      color: isCurrentUser ? '#ffffff' : colors.primary,
      fontWeight: 'bold',
      fontSize: 13,
    },
    replyContent: {
      color: isCurrentUser ? '#ffffffdd' : colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    image: {
      width: 200,
      height: 200,
      borderRadius: 12,
      marginBottom: 4,
    },
    timeText: {
      color: isCurrentUser ? '#ffffff99' : colors.textSecondary,
      fontSize: 10,
      textAlign: 'right',
      marginTop: 4,
    },
    editedText: {
      fontStyle: 'italic',
      color: isCurrentUser ? '#ffffff99' : colors.textSecondary,
    },
    readReceipt: {
      marginLeft: 4,
    },
    reactionsContainer: {
      position: 'absolute',
      bottom: -12,
      left: isCurrentUser ? undefined : 12,
      right: isCurrentUser ? 12 : undefined,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 4,
      paddingVertical: 2,
      elevation: 3,
    },
    reaction: {
      paddingHorizontal: 2,
    },
  });

export default ChatMessage;