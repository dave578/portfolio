import sqlite3
import hashlib
import PySimpleGUI as sg
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from tkinter import filedialog
from sklearn.preprocessing import OneHotEncoder

# Configurazione del database SQLite
conn = sqlite3.connect('users.db')
conn.execute('CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT)')
conn.execute('CREATE TABLE IF NOT EXISTS data (ID INTEGER, Marca TEXT, Modello TEXT, Colore TEXT, Materiale TEXT, Dimensione TEXT, Prezzo REAL, Tipo TEXT, ProtezioneUV TEXT, QualityTest TEXT)')
conn.close()

# Variabili globali per la codifica delle caratteristiche categoriche
model = None
onehot_encoders = {}  # Dizionario per memorizzare gli encoder per ogni caratteristica categorica

# Funzione per l'hashing della password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Funzione per la registrazione di un nuovo utente
def register_user(username, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username=?', (username,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        return False
    
    cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hash_password(password)))
    conn.commit()
    conn.close()
    return True

# Funzione per il login dell'utente
def login_user(username, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username=? AND password=?', (username, hash_password(password)))
    user = cursor.fetchone()
    conn.close()
    return user

# Funzione per caricare il file CSV

def load_csv(file_path):
    
     # Rimuovi le righe con elementi vuoti
    df.dropna(inplace=True)
    df = pd.read_csv(file_path, delimiter=';')
    df = pd.get_dummies(df, columns=['Marca', 'Modello', 'Colore', 'Materiale', 'Dimensione', 'Tipo', 'ProtezioneUV'])
    return df

# Funzione per addestrare il modello
def train_model(data, model_choice):
    X = data.drop('QualityTest', axis=1)
    y = data['QualityTest']

    global model
    if model_choice == 'Random Forest':
        model = RandomForestClassifier()
    elif model_choice == 'GaussianNB':
        model = GaussianNB()
        
    model.fit(X, y)
    return model

# Funzione per testare il modello

def test_model(model, data):
    X = data.copy()
    y = data['QualityTest']
    X = X.drop('QualityTest', axis=1)
    y_pred = model.predict(X)
    accuracy = accuracy_score(y, y_pred)
    return accuracy, y_pred

def open_file_dialog(window, mode):
    root = sg.tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[('CSV Files', '*.csv')])
    if file_path:
        df = pd.read_csv(file_path, delimiter=';')
        
        conn = sqlite3.connect('users.db')
        
        # Salva i dati originali prima dell'encoding one-hot
        df.to_sql('datacsv', conn, if_exists='replace', index=False)
        
        # Ora applica l'encoding one-hot
        df = pd.get_dummies(df, columns=['Marca', 'Modello', 'Colore', 'Materiale', 'Dimensione', 'Tipo', 'ProtezioneUV'])
        
        df.to_sql('data', conn, if_exists='replace', index=False)
        if mode == 'train':
            df_train, df_test = train_test_split(df, test_size=0.2, random_state=42)
            df_train, df_test = df_train.align(df_test, join='outer', axis=1, fill_value=0)
            df_train.to_sql('data_train', conn, if_exists='replace', index=False)
            df_test.to_sql('data_test', conn, if_exists='replace', index=False)
            sg.popup('Data uploaded and split into train and test sets successfully!')
        conn.close()
    else:
        sg.popup('No file selected')

def open_file_dialog_prediction(window):
    root = sg.tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[('CSV Files', '*.csv')])
    if file_path:
        df_pred = pd.read_csv(file_path, delimiter=';')
        conn = sqlite3.connect('users.db')
        df_train = pd.read_sql_query('SELECT * FROM data_train', conn)

        df_pred_encoded = pd.get_dummies(df_pred, columns=['Marca', 'Modello', 'Colore', 'Materiale', 'Dimensione', 'Tipo', 'ProtezioneUV'])

        columns = df_train.drop('QualityTest', axis=1).columns.tolist()
        df_pred_encoded = df_pred_encoded.reindex(columns=columns, fill_value=0)

        for col, onehot_encoder in onehot_encoders.items():
            if col in df_pred_encoded.columns:
                try:
                    df_pred_encoded = pd.concat([df_pred_encoded, pd.DataFrame(onehot_encoder.transform(df_pred_encoded[[col]]), columns=onehot_encoder.get_feature_names([col]))], axis=1).drop([col], axis=1)
                except Exception as e:
                    print(f'Error encoding column {col}: {e}. This column may contain unseen labels.')
                    continue

        if 'QualityTest' in df_pred_encoded.columns:
            df_pred_encoded = df_pred_encoded.drop('QualityTest', axis=1)

        y_pred = model.predict(df_pred_encoded)


        df_pred['QualityTest'] = y_pred

       
        df_pred.to_sql('data_pred', conn, if_exists='replace', index=False)

        conn.close()

        sg.popup('Prediction completed and saved to the database!')
    else:
        sg.popup('No file selected')

def export_data_pred():
    conn = sqlite3.connect('users.db')
    df_pred = pd.read_sql_query('SELECT * FROM data_pred', conn)
    conn.close()

    root = sg.tk.Tk()
    root.withdraw()
    file_path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[('CSV Files', '*.csv')])

    if file_path:
        df_pred.to_csv(file_path, index=False)
        sg.popup('Data exported successfully!')
    else:
        sg.popup('No file selected')
        
def plot_histograms(df, title):
    Materiale_values = df['Materiale'].unique()
    QualityTest_values = df['QualityTest'].unique()

    fig, axes = plt.subplots(len(Materiale_values), len(QualityTest_values), figsize=(12, 8), sharey=True)
    fig.subplots_adjust(hspace=0.4)

    for i, Materiale in enumerate(Materiale_values):
        for j, QualityTest in enumerate(QualityTest_values):
            ax = axes[i, j]
            mask = (df['Materiale'] == Materiale) & (df['QualityTest'] == QualityTest)
            data = df.loc[mask, 'Dimensione']
            ax.hist(data, bins=10, alpha=0.7)
            ax.set_xlabel('Dimensione')
            ax.set_ylabel('Count')
            ax.set_title(f'{Materiale} - {QualityTest}')
            ax.grid(True)

    plt.suptitle(title, fontsize=16)
    plt.tight_layout(rect=[0, 0, 1, 0.96])  
    plt.show()

def login_layout():
    sg.theme('DefaultNoMoreNagging')
    layout = [
        [sg.Text('Username')],
        [sg.Input(key='username')],
        [sg.Text('Password')],
        [sg.Input(key='password', password_char='*')],
        [sg.Button('Login'), sg.Button('Register')]
    ]
    windowM= sg.Window('Login', layout, finalize=True)
    
    # Massimizza la finestra a schermo intero
    
    windowM.Maximize()

    return windowM
def dashboard_layout(username):
    sg.theme('DefaultNoMoreNagging')
    layout = [
        [sg.Text(f'Logged in as: {username}')],
        [sg.Button('Upload Train Data')],
        [sg.Text('Choose Model:'), sg.Combo(['Random Forest', 'GaussianNB'], key='model_choice')],
        [sg.Button('Start Analysis')],
        [sg.Button('Prediction')],
        [sg.Button('Show Histograms')],
        [sg.Text('Choose Table:'), sg.Combo(['datacsv', 'data_pred'], key='table_name'),
         sg.Text('Enter column name:'), sg.Input(key='column_name'), 
         sg.Text('Enter search term:'), sg.Input(key='search_term'),
         sg.Radio('Equals', "RADIO1", default=True, key='equals'),
         sg.Radio('Contains', "RADIO1", key='contains'),
         sg.Button('Search')],
        [sg.Button('Query')],
        [sg.Button('Logout')],
        [sg.Text('*Note: The search is case-sensitive.', text_color='red')]
    ]
    window= sg.Window('Dashboard', layout, finalize=True)
    window.Maximize()

    return window

# Funzione per eseguire le query e visualizzare i risultati

def run_query(query):
    conn = sqlite3.connect('users.db')
    try:
        results = pd.read_sql_query(query, conn)
    except Exception as e:
        sg.popup('An error occurred during the query. Please check your inputs and try again. Error details: ' + str(e))
        results = None
    finally:
        conn.close()
    
    if results is not None:
        # Converto DataFrame a lista di liste per sg.Table
        data = results.values.tolist()
        # Creo lista principale
        header_list = list(results.columns)

        # Crea layout per la fnestra con tabella
        layout = [[sg.Table(values=data, headings=header_list, display_row_numbers=False, 
                            auto_size_columns=True, num_rows=min(25, len(data)))],
                  [sg.Button('OK')]]

        # Crea tabella
        window = sg.Window('Query Results', layout, finalize=True)

        while True:
            event, values = window.read()
            if event == 'OK' or event == sg.WIN_CLOSED:
                break

        window.close()

    return results  # restituisci il DataFrame


def search_data(table_name, column_name, search_term, equals=True):
    conn = sqlite3.connect('users.db')
    try:
        if equals:
            query = f'SELECT * FROM {table_name} WHERE {column_name} = ?'
        else:
            query = f'SELECT * FROM {table_name} WHERE {column_name} LIKE ?'
            search_term = '%' + search_term + '%'
        results = pd.read_sql_query(query, conn, params=(search_term,))
        conn.close()
    
        # Converto DataFrame a lista di liste per sg.Table
        data = results.values.tolist()
        # Creo lista principale
        header_list = list(results.columns)

        # Crea layout per la fnestra con tabella
        layout = [[sg.Table(values=data, headings=header_list, display_row_numbers=False, 
                            auto_size_columns=True, num_rows=min(25, len(data)))],
                  [sg.Button('OK')]]

        # Crea tabella
        window = sg.Window('Search Results', layout, finalize=True)

        while True:
            event, values = window.read()
            if event == 'OK' or event == sg.WIN_CLOSED:
                break

        window.close()

    except Exception as e:
        sg.popup('An error occurred during search. Please check your inputs and try again. Error details: ' + str(e))

        # Chiudere la connessione in caso di errore
        conn.close()

def main():
    login_window = login_layout()
    dashboard_window = None
    df_train = None

    while True:
        window, event, values = sg.read_all_windows()

        if window == login_window and event == sg.WINDOW_CLOSED:
            break

        if window == login_window and event == 'Login':
            username = values['username']
            password = values['password']
            user = login_user(username, password)
            if user:
                login_window.hide()
                dashboard_window = dashboard_layout(username)
            else:
                sg.popup('Invalid username or password')

        if window == login_window and event == 'Register':
            username = values['username']
            password = values['password']
            registered = register_user(username, password)
            if registered:
                sg.popup('Registration successful. Please log in.')
            else:
                sg.popup('Username already exists. Please choose a different username.')

        if window == dashboard_window and event == sg.WINDOW_CLOSED:
            break

        if window == dashboard_window and event == 'Upload Train Data':
            open_file_dialog(window, mode='train')

        if window == dashboard_window and event == 'Start Analysis':
            model_choice = values['model_choice']
            conn = sqlite3.connect('users.db')
            df_train = pd.read_sql_query('SELECT * FROM data_train', conn)
            conn.close()
            model = train_model(df_train, model_choice)
            accuracy, _ = test_model(model, df_train)
            sg.popup(f"Model trained successfully! Accuracy: {accuracy}")

        if window == dashboard_window and event == 'Prediction':
            open_file_dialog_prediction(window)
            export_data_pred()
            
        if window == dashboard_window and event == 'Show Histograms':
            conn = sqlite3.connect('users.db')
            df_pred = pd.read_sql_query('SELECT * FROM data_pred', conn)
            df_csv = pd.read_sql_query('SELECT * FROM datacsv', conn)
            conn.close()

            plot_histograms(df_csv, 'Histograms for Original Data')
            plot_histograms(df_pred, 'Histograms for Predicted Data')
        
        if window == dashboard_window and event == 'Query':
            query1 = "SELECT * FROM data_pred WHERE QualityTest = 'Fallito' "
            query2 =  "SELECT Materiale, Colore, Tipo, Dimensione, Marca, QualityTest, COUNT(*) AS Count FROM datacsv WHERE QualityTest = 'Fallito' GROUP BY Materiale, Colore, QualityTest, Tipo, Dimensione"
            results1 = run_query(query1)
            results2 = run_query(query2)
            print(f"Query 1 (data_pred):\n\n{results1}\n")
            print(f"Query 2 (datacsv):\n\n{results2}\n")
            plt.figure(figsize=(10, 6))
            plt.bar(results2.index, results2['Count'])
            plt.xticks(results2.index, results2['Materiale'] + ' - ' + results2['Colore'] + ' - ' + results2['Tipo'], rotation=90)
            plt.xlabel('Combinazione Materiale - Colore - Tipo')
            plt.ylabel('Count')
            plt.title('Istogramma dei conteggi per combinazione')
            plt.tight_layout()

            # Mostra l'istogramma
            plt.show()
            
        if window == dashboard_window and event == 'Search':
            table_name = values['table_name']
            column_name = values['column_name']
            search_term = values['search_term']
            equals = values['equals']
            results = search_data(table_name, column_name, search_term, equals)
            print(results)


        if window == dashboard_window and event == 'Logout':
            dashboard_window.hide()
            login_window.un_hide()

    login_window.close()
    if dashboard_window:
        dashboard_window.close()

if __name__ == '__main__':
    main()