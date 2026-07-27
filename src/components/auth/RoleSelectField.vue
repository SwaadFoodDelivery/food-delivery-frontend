<template>
  <v-select
    :model-value="modelValue"
    :items="ROLE_OPTIONS"
    item-title="label"
    item-value="value"
    :label="label"
    :disabled="disabled"
    :error-messages="errorMessage"
    :hint="selectedHint"
    persistent-hint
    variant="outlined"
    density="comfortable"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { ROLE_OPTIONS } from '@/constants/auth'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'I am a' },
  disabled: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

defineEmits(['update:modelValue'])

/**
 * Role is not cosmetic: accounts are unique per (phone, role), so the same
 * number can hold a separate account for each. The hint spells out what the
 * choice means before the user commits to it.
 */
const selectedHint = computed(
  () => ROLE_OPTIONS.find((option) => option.value === props.modelValue)?.hint ?? ''
)
</script>
