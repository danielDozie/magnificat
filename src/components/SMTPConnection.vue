<script setup>
import { ref, reactive, onMounted, watch } from 'vue';

const smtpForms = ref([{ host: '', user: '', password: '', port: '' }]);
const loading = reactive({});
const errors = reactive({});

// Load saved SMTP forms from localStorage on component mount
onMounted(() => {
    const savedForms = localStorage.getItem('smtpForms');
    if (savedForms) {
        smtpForms.value = JSON.parse(savedForms);
    }
});


const addNewForm = () => {
  smtpForms.value.push({ host: '', user: '', password: '', port: '' });
};

const removeForm = (index) => {
  smtpForms.value.splice(index, 1);
  delete loading[index];
  delete errors[index];
};

const validateForm = (form, index) => {
  errors[index] = {};
  if (!form.host) errors[index].host = 'Host is required';
  if (!form.user) errors[index].user = 'User/Email is required';
  if (!form.password) errors[index].password = 'Password is required';
  if (!form.port) errors[index].port = 'Port is required';
  else if (isNaN(form.port)) errors[index].port = 'Port must be a number';
  return Object.keys(errors[index]).length === 0;
};

const testConnection = async (form, index) => {
  if (!validateForm(form, index)) return;
  
  loading[index] = true;
  errors[index] = {};
  
  try {
    // Simulating API call
    const response = await fetch('/api/smtp-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (result.success) {
      alert('Connection successful!');
    } else {
      throw new Error(result.message || 'Connection failed');
    }
  } catch (error) {
    errors[index].connection = 'Connection failed. Please check your settings.';
  } finally {
    loading[index] = false;
  }
};

// Watch for changes in smtpForms and save to localStorage
watch(smtpForms, (newForms) => {
    localStorage.setItem('smtpForms', JSON.stringify(newForms));
}, { deep: true });
</script>

<template>
    <div v-for="(form, index) in smtpForms" :key="index" class="mb-6">
        <form class="flex flex-col gap-y-3 bg-green-900/50 p-6 rounded-lg">
            <div v-for="field in ['host', 'user', 'password', 'port']" :key="field" class="flex flex-col">
                <input v-model="form[field]" :placeholder="`SMTP ${field.charAt(0).toUpperCase() + field.slice(1)}`"
                    :type="field === 'password' ? 'password' : 'text'"
                    class="w-full px-3 py-1 bg-transparent border-slate-400 border rounded-md text-xs"
                    :class="{ 'border-red-500': errors[index]?.[field] }" />
                <span v-if="errors[index]?.[field]" class="text-red-500 text-xs mt-1">{{ errors[index][field] }}</span>
            </div>
            <div class="flex justify-between items-center">
                <button @click.prevent="testConnection(form, index)"
                    class="bg-blue-600 px-4 py-1 rounded-md text-xs disabled:opacity-50" :disabled="loading[index]">
                    {{ loading[index] ? 'Testing...' : 'Test Connection' }}
                </button>
                <button v-if="smtpForms.length > 1" @click.prevent="removeForm(index)"
                    class="bg-red-600 px-4 py-1 rounded-md text-xs">
                    Remove
                </button>
            </div>
            <span v-if="errors[index]?.connection" class="text-red-500 text-sm">{{ errors[index].connection }}</span>
        </form>
    </div>
    <div class="flex justify-center">
        <button @click.prevent="addNewForm" class="bg-green-600 px-6 py-1 rounded-lg text-sm">
            Add new SMTP
        </button>
    </div>
</template>