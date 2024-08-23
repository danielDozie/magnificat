<script setup>
import { ref, watch, computed } from 'vue';

const emailList = ref([]);
const invalidEmails = ref([]);
const emailCount = computed(() => emailList.value.length);

// Load emails from localStorage on component mount
const storedEmails = localStorage.getItem('emailList');
if (storedEmails) {
  emailList.value = JSON.parse(storedEmails);
}

const updateEmailList = (event) => {
  const input = event.target.value;
  const newEmailList = input
    .split(/[\n,]+/)  // Split by newlines or commas
    .map(email => email.trim())
    .filter(Boolean);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailList.value = newEmailList.filter(email => emailRegex.test(email));
  invalidEmails.value = newEmailList.filter(email => !emailRegex.test(email));
};

// Watch for changes in emailList and update localStorage
watch(emailList, (newValue) => {
  localStorage.setItem('emailList', JSON.stringify(newValue));
}, { deep: true });
</script>

<template>
  <div class="flex flex-col gap-y-4">
    <span class="space-y-2">
      <label>Email Recipients List ({{ emailCount }} emails)</label>
      <textarea
        :value="emailList.join(', ')"
        @input="updateEmailList"
        placeholder="Paste email addresses (separated by commas or new lines)"
        rows='20'
        class="w-full p-2 bg-transparent border-slate-400 border rounded-md"
      />
      <p v-if="invalidEmails.length > 0" class="text-red-500 text-sm mt-2">
        Invalid emails: {{ invalidEmails.join(', ') }}
      </p>
    </span>
  </div>
</template>