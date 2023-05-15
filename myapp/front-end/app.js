let Login = {
  template: ` 
    <div class="login" v-bind:style="{ styles }">
      <h1>Login</h1>
        <form>
          <div>
            <label for="username">Username</label>
            <input type="username" name="username" id="username" v-model="username">
          </div>
          <div>
            <label for="password">Password</label>
            <input type="password" name="password" id="password" v-model="password">
          </div>
          <button type="submit" @click.prevent="login">Login</button>
        </form>
    </div>
      ` ,
      data() {
        return {
          username: '',
          password: '',
        }
      },
      methods: {
        async login() {
          try {
            const response = await axios.post("/api/login", {
              username: this.username,
              password: this.password
            });
            const token = response.data.token;
            const userId = response.data.userId;
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId);
            this.$router.push('/Message');
            console.log(token);
            console.log(userId);
          } catch (error) {
            alert("Username o password errati");
            console.log(error);
            ;
          }
        }
      },
 }
let Registrati = {
  template: `
  <div class="register-container">
    <h2>Registrazione</h2>
    <form class="register-form" @submit.prevent="registerUser">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" v-model="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">  
      </div>
      <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit">Registrati</button>
     </form>
  </div>
`,
 data() {
      return {
        username: '',
        name:'',
        email: '',
        password: '',
      };
    },
      methods: {
            async registerUser() {
              try {
                const response = await axios.post('/api/register', {
                  username: this.username,
                  name: this.name,
                  email: this.email,
                  password: this.password,
                });
                console.log(response);
                this.$router.push('/Login');
              } catch (error) {
                console.log(error.response.data);
                alert("USERNAME GIA' UTILIZZATO")
              }
            }
            },
  };
  let Message = {
  template:
    `
    <div class="container">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center my-5">Messaggi</h1>
        <form @submit.prevent="addMessage">
          <div class="form-group d-flex align-items-center">
            <label for="message" class="mr-2">Messaggio</label>
            <textarea class="form-control" id="message" v-model="message.text" required rows="2"></textarea>
            <button type="submit" class="btn btn-primary ml-2">Invia</button>
          </div>
        </form>
      </div>
    </div>
    <hr>
    <div v-for="(message, index) in messages" :key="index">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong style="white-space: pre-wrap">{{ message.message}}</strong>
        </div>
        <div>
          <button type="button" class="btn btn-primary" @click="editMessage(index)">Modifica</button>
          <button type="button" class="btn btn-danger" @click="deleteMessage(index)">Elimina</button>
        </div>
      </div>
      <div v-if="editingMessage === message">
        <form @submit.prevent="saveMessage">
          <div class="form-group">
            <label for="editedMessage">Modifica messaggio</label>
            <textarea class="form-control" id="editedMessage" v-model="messageText" required rows="2"></textarea>
          </div>
          <button type="submit" class="btn btn-success">Salva</button>
          <button type="button" class="btn btn-danger" @click="cancelEdit">Annulla</button>
        </form>
      </div>
      <hr>
    </div>
    <div class="text-center">
      <button type="button" class="btn btn-danger" @click="deleteUser">Disiscriviti</button>
    </div>
  </div>  
  `,
    data() {
      return {
        messages: [],
        message: {
          text: ""
        },
        index: null,
        newMessage: {
          text: ""
        },
        messageText: "",
        editingMessage: null,
        userId: parseInt(localStorage.getItem("userId")),
        token: localStorage.getItem("token"),
        ids: [],
        texts: [],
      };
    },
    async created() {
      const userId = parseInt(localStorage.getItem("userId"));
      this.userId = userId;
      console.log(userId);
    
      const token = localStorage.getItem("token");
      this.token = token;
      console.log(token);
      try {
        const response = await axios.get(`/api/elencomsg/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.messages = response.data;
        this.ids = this.messages.map((message) => message.idMex);
        this.texts = this.messages.map((message) => message.message);
      } catch (error) {
        alert('ERR 500');
        console.log(error);
      }
    },
    methods: {
      async  deleteUser() {
        if (confirm("Sei sicuro di volerti disiscrivere?")) {
          if (confirm("Tutti i dati saranno persi, premi ok per continuare!")) {
            try {
              const response = await axios.delete(`/api/deluser/${this.userId}`, {
                headers: {
                  Authorization: `Bearer ${this.token}`,
                },
              });
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              alert("Disiscrizione avvenuta con successo.");
              window.location.href = "/#";
              location.reload();
            }
            catch (error) {
              console.log(error);
            }
          }
        }
      },
      async deleteMessage(index) {
        const id = this.ids[index];
        const idMex = id
        const token = localStorage.getItem("token");
        if (confirm("Sei sicuro di voler rimuovere il messaggio")) {
          try {
            const response = await axios.delete(`/api/delmsg/${idMex}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log(response);
            this.messages.splice(index, 1);
            this.ids.splice(index, 1);
            this.texts.splice(index, 1);
            alert("Messaggio eliminato definitivamente");
          } catch (error) {
            console.log(error);
            if (error.response && error.response.status === 500) {
              alert("Errore 500: Errore interno del server");
            } else {
              alert("Si è verificato un errore");
            }
          }
        }
      },
      async addMessage() {
        const userId = parseInt(localStorage.getItem('userId'));
        this.userId = userId;
        console.log(userId);
        const token = localStorage.getItem('token');
        this.token = token
        console.log(token);
        
        const messageText = this.message.text;
        try {
          const response = await axios.post(`/api/inviomsg/`, {
            userId : userId,
            message: messageText
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          this.messages.push(response.data);
          this.message.text = '';
          window.location.reload(); 
        } catch (error) {
          console.log(error);
          if (error.response && error.response.status === 500) {
            alert('Si è verificato un errore durante l\'invio del messaggio. Riprova più tardi.');
          } 
        }
      },   
async editMessage(index) {
  this.editingMessage = this.messages[index];
  this.messageText = this.editingMessage.message;
              },
      async saveMessage() {
        const idMex = this.editingMessage.idMex;
        const token = localStorage.getItem("token");
        try {
          const response = await axios.put(
            `/api/changemsg/${idMex}`,
            { message: this.messageText },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log(response);
          this.editingMessage.message = this.messageText;
          this.editingMessage = null;
          this.messageText = "";
        } catch (error) {
          console.log(error);
        }
      },
      async cancelEdit() {
        this.editingMessage = null;
        this.messageText = "";
      },
    },
  };
Vue.use(VueRouter);
const router = new VueRouter({
  routes: [
    {
      path: '/Login',
      name: 'Login',
      component: Login
      
    },
    {
      path: '/Registrati',
      name: 'Registrati',
      component: Registrati
    },
    {
      path: '/Message',
      name: 'Message',
      component: Message
    },  
  ]
});
  const app = new Vue({
    el: '#app',
    router,
    data: {
      message:'Effettua il Login oppure Registrati'
      }
 });