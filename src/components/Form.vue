<script setup>
import { ref, watch } from 'vue';

const from = ref('');
const name = ref('');
const subject = ref('');
const message = ref('');

// emailLists: An array to store multiple email lists
const emailLists = ref(JSON.parse(localStorage.getItem('emailList')) || []);

// smtpConfigs: An array to store multiple SMTP configurations
const smtpConfigs = ref(JSON.parse(localStorage.getItem('smtpForms')) || []);

const recipients = ref(JSON.parse(localStorage.getItem('emailList'))?.length || '0');
const connections = ref(JSON.parse(localStorage.getItem('smtpForms'))?.length || '0');

// Function to update local storage
const updateLocalStorage = () => {
    localStorage.setItem('recipients', JSON.stringify(recipients.value));
    localStorage.setItem('connections', JSON.stringify(connections.value));
};

// Watch for changes and update local storage
watch([recipients, connections], updateLocalStorage, { immediate: true });

const loading = ref(false);


const sendMail = async () => {
    loading.value = true;
    if (!from.value || !subject.value || !message.value || !name.value) {
        alert('Oga! fill in all fields before sending. 😜');
        loading.value = false;
        return;
    }
    const confirmed = await confirm(`Are you sure? There are ${recipients.value} RECIPIENTS and ${connections.value} SMTP connections.`);
    if (confirmed) {
        try {
            const response = await fetch('/api/handler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formData: { from: from.value, name: name.value, subject: subject.value, message: message.value },
                    emailLists: emailLists.value,
                    smtpConfigs: smtpConfigs.value,
                }),
            });
            const result = await response.json();
            if (response.ok) {
                alert(`Emails sent successfully. ${result.totalSent} total sent, ${result.totalFailed} failed, ${result.totalUnsent} unsent.`);
                localStorage.clear();
                window.location.reload();
            } else {
                throw new Error(result.error || 'Failed to send emails');
            }
        } catch (error) {
            console.error('Error sending emails:', error);
            alert('Failed to send emails. Please check the console for more details.');
        } finally {
            loading.value = false;
        }
    } else {
        loading.value = false;
    }
    
}

</script>

<template>
    <form class="flex flex-col gap-y-4" @submit.prevent="sendMail">
        <span class="space-y-2">
            <label>From</label>
            <div class="flex gap-4">
                <input v-model="from" placeholder="Sender email address"
                    class="w-full p-2 bg-transparent border-slate-400 border rounded-md" />
                <input v-model="name" placeholder="Sender name"
                    class="w-full p-2 bg-transparent border-slate-400 border rounded-md" />
        </div>
        </span>
        <span class="space-y-2">
            <label>Subject</label>
            <input v-model="subject" placeholder="Enter email subject"
                class="w-full p-2 bg-transparent border-slate-400 border rounded-md" />
        </span>
        <span class="space-y-2">
            <label>HTML Message</label>
            <div class="flex flex-col space-y-2">
                <textarea v-model="message" placeholder="Enter HTML Message" rows='5'
                    class="w-full p-2 bg-transparent border-slate-400 border rounded-md" />
                <div v-if="message" class="mt-2 p-4 bg-white text-black rounded-md">
                    <h4 class="text-sm font-semibold mb-2">Preview:</h4>
                    <div v-html="message"></div>
                </div>
            </div>
        </span>
        <span class="flex space-y-2 justify-center items-center">
            <button type="submit"
                :class="[loading ? 'bg-gray-800' : 'bg-green-600', 'px-12 py-2 rounded-xl flex items-center justify-center']">
                <span v-if="loading"
                    class="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                {{ loading ? "Sending messages..." : "Bomb this mail 💣" }}
            </button>
        </span>
    </form>
</template>