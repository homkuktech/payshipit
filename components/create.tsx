import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Button,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { CheckCircle, Circle } from 'lucide-react-native';

type Profile = Tables<'profiles'>;

export default function CreateChatScreen() {
  const { colors } = useTheme();
  const { profile: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .not('id', 'eq', currentUser.id); // Exclude current user from the list

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No users selected', 'Please select at least one user to start a chat.');
      return;
    }

    if (selectedUsers.length > 1 && !groupName.trim()) {
      Alert.alert('Group name required', 'Please enter a name for your group chat.');
      return;
    }

    setIsCreating(true);
    try {
      const { data: conversationId, error } = await supabase.rpc('create_new_conversation', {
        participant_ids: selectedUsers,
        group_name: selectedUsers.length > 1 ? groupName.trim() : null,
      });

      if (error) throw error;

      // Navigate to the newly created chat
      router.replace(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', error.message || 'Failed to create chat.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUser = ({ item }: { item: Profile }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <TouchableOpacity style={styles.userRow} onPress={() => toggleUserSelection(item.id)}>
        <Text style={styles.userName}>{item.full_name}</Text>
        {isSelected ? (
          <CheckCircle size={24} color={colors.primary} />
        ) : (
          <Circle size={24} color={colors.border} />
        )}
      </TouchableOpacity>
    );
  };

  const styles = getStyles(colors);

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Chat</Text>
      {selectedUsers.length > 1 && (
        <TextInput
          style={styles.input}
          placeholder="Group Name"
          value={groupName}
          onChangeText={setGroupName}
          placeholderTextColor={colors.textSecondary}
        />
      )}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListHeaderComponent={<Text style={styles.subtitle}>Select Users</Text>}
      />
      <View style={styles.buttonContainer}>
        {isCreating ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title="Create Chat"
            onPress={handleCreateChat}
            disabled={selectedUsers.length === 0}
          />
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userName: {
    fontSize: 16,
    color: colors.text,
  },
  buttonContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});