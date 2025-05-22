// models/Inscricao.js
import mongoose from 'mongoose';

const inscricaoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    telefone: { type: String, required: true },
    dataDeNascimento: { type: Date, required: true }, // Adicionado 'required'
    email: { type: String, required: true },
    cpf: { type: String, required: true },
    rg: { type: String, required: true },
    cep: { type: String, required: true },
    endereco: { type: String, required: true }, // Adicionado 'required'
    numero: { type: String, required: true },   // Adicionado 'required'
    bairro: { type: String, required: true },   // Adicionado 'required'
    cidade: { type: String, required: true },   // Adicionado 'required'
    tipoDeTrajeto: { type: String, required: true },
    localDeEmbarque: { type: String, required: true },
    localDeDestino: {type: String, required: true},
    
    // CAMPOS DE DATA DE CONTRATO (AJUSTADOS conforme discutido)
    dataInicioContrato: { type: String, required: true }, // Ex: "2025-02-01"
    dataFimContrato: { type: String, required: true },     // Ex: "2026-01-31"

    // CAMPOS DE HORÁRIO (AJUSTADOS conforme discutido)
    horarioDeEntrada: { type: String, required: true }, // Ex: "08:00"
    horarioDeSaida: { type: String, required: true },   // Ex: "17:30"
    
    // CAMPO DIA DE VENCIMENTO (AJUSTADO conforme discutido)
    diaDeVencimento: { type: Number, required: true }, // Para guardar apenas o número do dia (ex: 10)

    valor: { type: Number, required: true }, // Adicionado 'required'
    assinatura: { type: String, required: true }, // Base64 da assinatura - CUIDADO COM O TAMANHO
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware para atualizar 'updatedAt' antes de salvar
inscricaoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Inscricao = mongoose.model('Inscricao', inscricaoSchema);

export default Inscricao;