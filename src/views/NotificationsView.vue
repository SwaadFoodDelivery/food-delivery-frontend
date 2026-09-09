<template>
  <main class="notifications">
    <header class="notifications__header">
      <div>
        <p class="notifications__eyebrow">Swaad demo</p>
        <h1>Notifications</h1>
        <p class="notifications__subtext">Order, delivery, and workspace updates for this signed-in account.</p>
      </div>
      <button v-if="unreadCount" type="button" class="notifications__button" @click="readAll">Mark all read</button>
    </header>

    <p v-if="error" class="notifications__error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="notifications__state">Loading notifications…</p>
    <p v-else-if="!items.length" class="notifications__state">You are all caught up.</p>
    <ul v-else class="notifications__list">
      <li v-for="item in items" :key="item.notification_id" :class="['notifications__item', { 'notifications__item--unread': !item.is_read }]">
        <div class="notifications__item-copy">
          <span v-if="!item.is_read" class="notifications__dot" aria-label="Unread" />
          <div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.body }}</p>
            <time :datetime="item.created_at">{{ formatDate(item.created_at) }}</time>
          </div>
        </div>
        <button v-if="!item.is_read" type="button" class="notifications__read" @click="read(item)">Mark read</button>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'

import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notificationService'

const items = ref([])
const unreadCount = ref(0)
const loading = ref(true)
const error = ref('')

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await listNotifications()
    items.value = result?.items || []
    unreadCount.value = result?.unread_count || 0
  } catch (caught) {
    error.value = caught?.message || 'Notifications could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function read(item) {
  try {
    await markNotificationRead(item.notification_id)
    item.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (caught) {
    error.value = caught?.message || 'Notification could not be updated.'
  }
}

async function readAll() {
  try {
    await markAllNotificationsRead()
    items.value.forEach((item) => { item.is_read = true })
    unreadCount.value = 0
  } catch (caught) {
    error.value = caught?.message || 'Notifications could not be updated.'
  }
}

onMounted(load)
</script>

<style scoped>
.notifications { min-height: 100vh; max-width: 780px; margin: 0 auto; padding: 2rem 1.25rem 4rem; color: rgb(var(--v-theme-on-background)); }
.notifications__header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.notifications__eyebrow { margin: 0 0 .35rem; color: rgb(var(--v-theme-primary)); font-size: .8rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; color: rgb(var(--v-theme-primary)); }
.notifications__subtext { margin: .5rem 0 0; color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity)); }
.notifications__button, .notifications__read { border: 0; border-radius: 10px; background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); cursor: pointer; font: inherit; font-weight: 700; padding: .7rem 1rem; }
.notifications__list { display: grid; gap: .75rem; list-style: none; margin: 0; padding: 0; }
.notifications__item { align-items: center; background: rgb(var(--v-theme-surface)); border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 16px; display: flex; gap: 1rem; justify-content: space-between; padding: 1rem; }
.notifications__item--unread { border-color: rgb(var(--v-theme-primary)); }
.notifications__item-copy { display: flex; gap: .75rem; min-width: 0; }
.notifications__item h2 { font-size: 1rem; margin: 0; }
.notifications__item p { margin: .35rem 0; }
.notifications__item time { color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity)); font-size: .8rem; }
.notifications__dot { background: rgb(var(--v-theme-primary)); border-radius: 50%; flex: 0 0 9px; height: 9px; margin-top: .4rem; width: 9px; }
.notifications__read { background: transparent; border: 1px solid rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-primary)); white-space: nowrap; }
.notifications__state, .notifications__error { border-radius: 12px; padding: 1rem; background: rgb(var(--v-theme-surface)); }
.notifications__error { color: rgb(var(--v-theme-error)); }
@media (max-width: 560px) { .notifications__header, .notifications__item { align-items: stretch; flex-direction: column; } .notifications__button, .notifications__read { width: 100%; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition: none !important; } }
</style>
