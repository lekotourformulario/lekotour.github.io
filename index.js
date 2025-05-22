import express from "express";
import mongoose from "mongoose";
import Inscricao from "./models/inscricao.js";
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // ou outro serviço de e-mail (ex: 'smtp.seudominio.com' se for um e-mail personalizado)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function enviarEmail(dados, assinaturaBase64) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.CLIENT_EMAIL_RECIPIENT || 'alex.milam@hotmail.com', // Use uma variável de ambiente para o e-mail do cliente
        subject: `Nova Inscrição de Transporte Escolar - ${dados.nome}`,
        html: `<p>Olá,</p><p>Uma nova inscrição de transporte escolar foi realizada por ${dados.nome}.</p>
                <p>Detalhes:</p>
                <ul>
                    <li>Nome: ${dados.nome}</li>
                    <li>Telefone: ${dados.telefone}</li>
                    <li>Data de Nascimento: ${dados.dataDeNascimento}</li>
                    <li>Email: ${dados.email}</li>
                    <li>CPF: ${dados.cpf}</li>
                    <li>RG: ${dados.rg}</li>
                    <li>CEP: ${dados.cep}</li>
                    <li>Endereço: ${dados.endereco}</li>
                    <li>Número: ${dados.numero}</li>
                    <li>Bairro: ${dados.bairro}</li>
                    <li>Cidade: ${dados.cidade}</li>
                    <li>Tipo de Trajeto: ${dados.tipoDeTrajeto}</li>
                    <li>Local de Embarque: ${dados.localDeEmbarque}</li>
                    <li>Local de Destino: ${dados.localDeDestino}</li>
                    <li>Início do Contrato: ${dados.dataInicioContrato || 'N/A'}</li>
                    <li>Fim do Contrato: ${dados.dataFimContrato || 'N/A'}</li>
                    <li>Horário de Entrada: ${dados.horarioDeEntrada || 'N/A'}</li>
                    <li>Horário de Saída: ${dados.horarioDeSaida || 'N/A'}</li>
                    <li>Dia de Vencimento: ${dados.diaDeVencimento}</li>
                    <li>Valor: ${dados.valor}</li>
                </ul>
                <p>A assinatura está anexada a este e-mail.</p>`,
        attachments: [
            {
                filename: `assinatura_${dados.nome.replace(/\s/g, '_')}.png`,
                content: assinaturaBase64.split('base64,')[1],
                encoding: 'base64',
            },
        ],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail enviado:', info.messageId);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
    }
}

app.post("/api/inscricoes", async (req, res) => {
    const inscricaoData = req.body;

    // --- Tratamento do campo 'valor' ---
    if (inscricaoData.valor && typeof inscricaoData.valor === 'string') {
        let valorNumericoFormatado = inscricaoData.valor
            .replace('R$', '')
            .trim()
            .replace(/\./g, '')
            .replace(',', '.');

        const parsedValor = parseFloat(valorNumericoFormatado);

        if (isNaN(parsedValor)) {
            console.error("Erro: Valor inválido fornecido para o campo 'valor'. Recebido:", inscricaoData.valor);
            return res.status(400).json({ message: "O valor informado para o campo 'Valor Mensal' é inválido." });
        }
        inscricaoData.valor = parsedValor;
    }

    // --- LÓGICA ESSENCIAL: Combinar dia/mês/ano para datas ---
    // dataDeNascimento já é um input type="date" no frontend, então já vem formatado
    // como "YYYY-MM-DD" e pode ser salvo como Date no Mongoose ou String.

    if (inscricaoData.diaInicio && inscricaoData.mesInicio && inscricaoData.anoInicio) {
        // Formato ISO 8601 (YYYY-MM-DD) é o ideal para banco de dados ou Date objects
        inscricaoData.dataInicioContrato = `${inscricaoData.anoInicio}-${inscricaoData.mesInicio.padStart(2, '0')}-${inscricaoData.diaInicio.padStart(2, '0')}`;
        // Limpa os campos separados para não serem salvos no Mongoose
        delete inscricaoData.diaInicio;
        delete inscricaoData.mesInicio;
        delete inscricaoData.anoInicio;
    } else {
        // Se esses campos forem obrigatórios, você deve retornar um erro.
        // Por exemplo: return res.status(400).json({ message: "Data de início do contrato é obrigatória." });
    }

    if (inscricaoData.diaFim && inscricaoData.mesFim && inscricaoData.anoFim) {
        inscricaoData.dataFimContrato = `${inscricaoData.anoFim}-${inscricaoData.mesFim.padStart(2, '0')}-${inscricaoData.diaFim.padStart(2, '0')}`;
        delete inscricaoData.diaFim;
        delete inscricaoData.mesFim;
        delete inscricaoData.anoFim;
    } else {
        // Se esses campos forem obrigatórios, você deve retornar um erro.
        // Por exemplo: return res.status(400).json({ message: "Data de fim do contrato é obrigatória." });
    }

    // --- LÓGICA ESSENCIAL: Combinar hora/minuto para horários ---
    if (inscricaoData.horaEntrada && inscricaoData.minutoEntrada) {
        // Formato HH:MM
        inscricaoData.horarioDeEntrada = `${inscricaoData.horaEntrada.padStart(2, '0')}:${inscricaoData.minutoEntrada.padStart(2, '0')}`;
        delete inscricaoData.horaEntrada;
        delete inscricaoData.minutoEntrada;
    } else {
        // return res.status(400).json({ message: "Horário de entrada é obrigatório." });
    }

    if (inscricaoData.horaSaida && inscricaoData.minutoSaida) {
        inscricaoData.horarioDeSaida = `${inscricaoData.horaSaida.padStart(2, '0')}:${inscricaoData.minutoSaida.padStart(2, '0')}`;
        delete inscricaoData.horaSaida;
        delete inscricaoData.minutoSaida;
    } else {
        // return res.status(400).json({ message: "Horário de saída é obrigatório." });
    }

    // O diaDeVencimento já vem como string "01", "10", etc. do frontend e o schema aceita Number,
    // então converta para Number aqui.
    if (inscricaoData.diaDeVencimento && typeof inscricaoData.diaDeVencimento === 'string') {
        const parsedDay = parseInt(inscricaoData.diaDeVencimento, 10);
        if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
            return res.status(400).json({ message: "Dia de vencimento inválido." });
        }
        inscricaoData.diaDeVencimento = parsedDay;
    } else {
        // return res.status(400).json({ message: "Dia de vencimento é obrigatório." });
    }


    try {
        // Guarda a assinatura para o e-mail antes de remover do objeto principal
        const assinaturaParaEmail = inscricaoData.assinatura;
        // A assinatura Base64 é grande e só precisa ser enviada por e-mail, não salva no DB
        // Se você decidiu não salvar a assinatura no DB, remova-a daqui.
        // Se no futuro você quiser salvar a URL de uma imagem enviada para um Cloud Storage,
        // então você salvaria a URL aqui.
        // Por enquanto, como o schema a exige, vamos mantê-la no objeto para a criação do Mongoose,
        // mas é uma má prática. Idealmente, você não teria 'assinatura' no seu schema se apenas a usa para e-mail.
        // Ou, se o schema a exige, você precisaria de um serviço para armazená-la e salvar a URL.

        // POR FAVOR, REVEJA SE VOCÊ REALMENTE QUER SALVAR O BASE64 DA ASSINATURA NO MONGODB.
        // É ALTAMENTE RECOMENDADO NÃO FAZÊ-LO.
        // Se não for salvar, comente a linha abaixo no schema.
        // Se for salvar, lembre-se do limite de 16MB por documento MongoDB.

        // Se você NÃO quer salvar a assinatura no DB, descomente a linha abaixo:
        // delete inscricaoData.assinatura; // Isso faria com que o Mongoose não a salvasse.
        // MAS CUIDADO: Se o schema tem 'assinatura: { required: true }', isso causará erro.
        // VOCÊ PRECISA MUDAR O SCHEMA (models/inscricao.js) SE NÃO QUISER SALVAR O BASE64.

        const novaInscricao = await Inscricao.create(inscricaoData); // Salva no DB

        if (assinaturaParaEmail) {
            await enviarEmail(inscricaoData, assinaturaParaEmail); // Envia o e-mail com a assinatura
        } else {
            console.warn("Assinatura não foi fornecida para o e-mail, mas a inscrição foi salva.");
            // Você pode decidir retornar um erro 400 aqui se a assinatura for essencial
            // return res.status(400).json({ message: "Assinatura é obrigatória." });
        }

        return res.status(201).json(novaInscricao);
    } catch (error) {
        console.error("Erro ao salvar inscrição ou enviar e-mail:", error);
        if (error.name === 'ValidationError') {
            // Detalha os erros de validação do Mongoose
            const errors = {};
            for (let field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({ message: "Erro de validação nos dados fornecidos.", errors: errors });
        }
        return res.status(500).json({ message: "Erro interno do servidor ao salvar inscrição ou enviar e-mail." });
    }
});

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI) // Usando variável de ambiente
.then(() => console.log("banco de dados esta conectado"))
.catch((err) => {
    console.error("banco de dados nao conectado:", err);
    process.exit(1); // Encerra o processo se a conexão falhar
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});