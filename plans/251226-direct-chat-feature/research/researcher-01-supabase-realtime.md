# Supabase Realtime for Live Messaging - Research Report

## 1. Subscription Patterns for Messages

### Channel Architecture
Supabase Realtime uses broadcast channels with standard naming: `{schema}:{table}:{filter}`

For conversation-specific messaging:
```typescript
const channel = supabase
  .channel(`messages:conversation_id=eq.${conversationId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('New message:', payload);
    }
  )
  .subscribe();
```

### Subscription Lifecycle
- **Subscribe**: Returns subscription object with callbacks
- **Unsubscribe**: `channel.unsubscribe()` or `supabase.removeChannel(channel)`
- **Cleanup**: Must remove when component unmounts

## 2. Conversation-Specific Channels

### Pattern 1: Single Subscription
```typescript
const [messages, setMessages] = useState([]);

useEffect(() => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        setMessages(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId, supabase]);
```

### Pattern 2: Multiple Event Types
```typescript
const channel = supabase
  .channel(`chat:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload.new)
  )
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'messages' },
    (payload) => handleMessageUpdate(payload.new)
  )
  .on('postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'messages' },
    (payload) => handleMessageDelete(payload.old.id)
  )
  .subscribe();
```

## 3. Presence & Online Status

### Presence Pattern
```typescript
useEffect(() => {
  const presenceChannel = supabase.channel(`presence:${conversationId}`);

  const presenceSubscription = presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      setActiveUsers(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: currentUserId,
          status: 'online',
          typing: false,
        });
      }
    });

  return () => {
    presenceChannel.untrack();
    supabase.removeChannel(presenceChannel);
  };
}, [conversationId, currentUserId]);
```

### Typing Indicator Pattern
```typescript
const handleTyping = async (isTyping: boolean) => {
  await presenceChannel.track({
    user_id: currentUserId,
    status: 'online',
    typing: isTyping,
  });
};
```

## 4. Unsubscribe & Cleanup Patterns

### React useEffect Cleanup
```typescript
useEffect(() => {
  const channel = supabase.channel(`messages:${conversationId}`);

  const subscription = channel
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload) => updateMessages(payload)
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to messages');
      }
    });

  // Cleanup function
  return () => {
    channel.unsubscribe();
    // OR: supabase.removeChannel(channel);
  };
}, [conversationId]);
```

### Multiple Channel Cleanup
```typescript
const channelRefs = useRef<RealtimeChannel[]>([]);

useEffect(() => {
  const messagesChannel = supabase.channel(`messages:${conversationId}`);
  const presenceChannel = supabase.channel(`presence:${conversationId}`);

  messagesChannel.subscribe();
  presenceChannel.subscribe();

  channelRefs.current = [messagesChannel, presenceChannel];

  return () => {
    channelRefs.current.forEach(ch => supabase.removeChannel(ch));
  };
}, [conversationId]);
```

## 5. Error Handling & Reconnection

### Status Monitoring
```typescript
const channel = supabase.channel(`messages:${conversationId}`);

channel
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
    (payload) => handleMessage(payload)
  )
  .subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.error('Channel error, will retry');
    } else if (status === 'TIMED_OUT') {
      console.error('Subscription timed out');
    } else if (status === 'SUBSCRIBED') {
      console.log('Connected to realtime');
    }
  });
```

## 6. Performance Considerations

- **Channel Naming**: Use `{table}:{filter}` for RLS row-level security
- **Rate Limiting**: Presence updates trigger on every `.track()` call - debounce typing indicators
- **Memory**: Always unsubscribe in cleanup - lingering subscriptions cause memory leaks
- **Bandwidth**: Filter at DB level using RLS policies, not client-side
- **Latency**: Realtime messages typically <100ms in regions with good connectivity

## 7. Key Takeaways

1. **Always cleanup**: Unsubscribe in `useEffect` return function
2. **Use RLS filters**: Let database filter messages via security policies
3. **Debounce presence**: Typing indicators need debouncing to avoid spam
4. **Monitor status**: Handle `CHANNEL_ERROR`, `TIMED_OUT`, `SUBSCRIBED` states
5. **Single source of truth**: Keep messages in state, not scattered listeners
6. **Conversation isolation**: Each conversation gets its own channel

## Unresolved Questions

- Row-level security (RLS) filter syntax for multi-user conversations
- Optimal debounce timing for typing indicators
- Best practice for syncing historical messages + realtime updates
