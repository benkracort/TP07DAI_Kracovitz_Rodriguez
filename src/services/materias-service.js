import MateriasRepository from '../repositories/materias-repository.js';

export default class MateriasService {

    constructor() {
        this.MateriasRepository = new MateriasRepository();
    }

    getAllAsync = async () => {
        return await this.MateriasRepository.getAllAsync();
    }

    getByIdAsync = async (id) => {
        return await this.MateriasRepository.getByIdAsync(id);
    }

    createAsync = async (entity) => {

        if (!entity.nombre || entity.nombre.trim() === '') {
            throw new Error('El nombre de la materia es obligatorio.');
        }

        return await this.MateriasRepository.createAsync(entity);
    }

    updateAsync = async (entity) => {
        return await this.MateriasRepository.updateAsync(entity);
    }

    deleteByIdAsync = async (id) => {
        return await this.MateriasRepository.deleteByIdAsync(id);
    }
}