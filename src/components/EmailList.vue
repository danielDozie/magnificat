<script setup>
import { ref, watch, computed } from 'vue';

const emailList = ref([]);
const invalidEmails = ref([]);
const showUnsentOnly = ref(false);

// Update emailCount to react to both emailList and storedEmails
const emailCount = computed(() => showUnsentOnly.value ? emailList.value.length : storedEmails.value.length);

//load prev. email list from file data
import prevEmailList from './../../unsent_emails.json';

// Load emails from localStorage on component mount
const storedEmails = ref(JSON.parse(localStorage.getItem('emailList')) || []);

const updateEmailDisplay = () => {
    if (showUnsentOnly.value) {
        emailList.value = prevEmailList;
        localStorage.setItem('emailList', JSON.stringify(prevEmailList));
    } else {
        emailList.value = storedEmails.value;
        localStorage.setItem('emailList', JSON.stringify(storedEmails.value));
    }
};

// Initial update
updateEmailDisplay();

const toggleUnsentEmails = () => {
    showUnsentOnly.value = !showUnsentOnly.value;
    updateEmailDisplay();
};

const filterOutUnsentEmails = () => {
    if (confirm('Are you sure you want to filter out unsent emails?')) {
        const filteredEmails = storedEmails.value.filter(email => !prevEmailList.includes(email));
        storedEmails.value = filteredEmails;
        localStorage.setItem('emailList', JSON.stringify(filteredEmails));
        updateEmailDisplay();
        alert('Unsent emails have been filtered out successfully.');
    }
};

const updateEmailList = (event) => {
  const input = event.target.value;
  const newEmailList = input
    .split(/[\n,]+/)  // Split by newlines or commas
    .map(email => email.trim())
    .filter(Boolean);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailList.value = newEmailList.filter(email => emailRegex.test(email));
  invalidEmails.value = newEmailList.filter(email => !emailRegex.test(email));
  
  // Update storedEmails when the list is modified
  if (!showUnsentOnly.value) {
    storedEmails.value = emailList.value;
    localStorage.setItem('emailList', JSON.stringify(storedEmails.value));
  }
};

// Watch for changes in showUnsentOnly and update localStorage
watch(showUnsentOnly, (newValue) => {
  if (!newValue) {
    localStorage.setItem('emailList', JSON.stringify(storedEmails.value));
  }
});

// Watch for changes in emailList
watch(emailList, (newValue) => {
  if (!showUnsentOnly.value) {
    storedEmails.value = newValue;
    localStorage.setItem('emailList', JSON.stringify(newValue));
  }
});

// Watch for changes in storedEmails
watch(storedEmails, (newValue) => {
  if (!showUnsentOnly.value) {
    emailList.value = newValue;
    localStorage.setItem('emailList', JSON.stringify(newValue));
  }
});

// Watch for changes in prevEmailList
watch(() => prevEmailList, (newValue) => {
  if (showUnsentOnly.value) {
    emailList.value = newValue;
    localStorage.setItem('emailList', JSON.stringify(newValue));
  }
}, { deep: true });
</script>

<template>
    <div class="flex flex-col gap-y-4">
        <span class="space-y-2">
            <div class="flex justify-between items-center">
                <label>Email Recipients List ({{ emailCount }} emails)</label>
            </div>
            <textarea :value="emailList.join(', ')" @input="updateEmailList"
                placeholder="Paste email addresses (separated by commas or new lines)" rows='20'
                class="w-full p-2 bg-transparent border-slate-400 border rounded-md" />
            <div class="space-x-2 flex gap-2">
                <button @click="toggleUnsentEmails" class="px-4 py-1 bg-blue-500 text-white rounded-md text-xs">
                    {{ showUnsentOnly ? 'Show all emails' : 'Show unsent emails only' }}
                </button>
                <button @click="filterOutUnsentEmails" class="px-4 py-1 bg-red-500 text-white rounded-md text-xs">
                    Remove all unsent emails
                </button>
            </div>
            <p v-if="invalidEmails.length > 0" class="text-red-500 text-sm mt-2">
                Invalid emails: {{ invalidEmails.join(', ') }}
            </p>
        </span>
    </div>
</template>