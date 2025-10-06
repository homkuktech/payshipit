import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Button,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { CheckCircle, Circle } from 'lucide-react-native';

type Profile = Tables<'profiles'>;

export default function AddParticipantsScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!conversationId) return;
    try {
      // 1. Get IDs of users already in the chat
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId as string);

      if (participantsError) throw participantsError;
      const existingUserIds = participantsData.map(p => p.user_id);

      // 2. Fetch all users who are NOT in that list
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${existingUserIds.join(',')})`);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users to add:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No users selected', 'Please select at least one user to add.');
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase.rpc('add_participants_to_conversation', {
        p_conversation_id: conversationId,
        p_new_participant_ids: selectedUsers,
      });

      if (error) throw error;

      Alert.alert('Success', 'New participants have been added to the chat.');
      router.back(); // Go back to the chat screen
    } catch (error: any) {
      console.error('Error adding participants:', error);
      Alert.alert('Error', error.message || 'Failed to add participants.');
    } finally {
      setIsAdding(false);
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
      <Text style={styles.title}>Add Participants</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListEmptyComponent={<Text style={styles.emptyText}>No other users to add.</Text>}
      />
      <View style={styles.buttonContainer}>
        {isAdding ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title={`Add ${selectedUsers.length} User(s)`}
            onPress={handleAddParticipants}
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
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
  },
  buttonContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});