import CalificacionesRepository from '../repositories/calificaciones-repository.js';
import AlumnosService from './alumnos-service.js';
import MateriasService from './materias-service.js';

export default class CalificacionesService {
    constructor() {
        console.log('Estoy en: CalificacionesService.constructor()');

        this.CalificacionesRepository = new CalificacionesRepository();
        this.AlumnosService = new AlumnosService();
        this.MateriasService = new MateriasService();
    }

    getAllAsync = async () => {
        return await this.CalificacionesRepository.getAllAsync();
    }

    getByIdAsync = async (id) => {
        return await this.CalificacionesRepository.getByIdAsync(id);
    }

    getByAlumnoAsync = async (idAlumno) => {
        await this.validarAlumnoExiste(idAlumno);
        return await this.CalificacionesRepository.getByAlumnoAsync(idAlumno);
    }

    createAsync = async (entity) => {
        await this.validarAlumnoExiste(entity.id_alumno);
        await this.validarMateriaExiste(entity.id_materia);
        this.validarNota(entity.nota);

        const existe =
            await this.CalificacionesRepository.existsByAlumnoMateriaAsync(
                entity.id_alumno,
                entity.id_materia
            );

        if (existe) {
            throw new Error(
                `Ya existe una calificación para el alumno ${entity.id_alumno} en la materia ${entity.id_materia}`
            );
        }

        return await this.CalificacionesRepository.createAsync(entity);
    }

    updateAsync = async (entity) => {
        const actual = await this.CalificacionesRepository.getByIdAsync(entity.id);

        if (actual == null) {
            throw new Error(`La calificación con id ${entity.id} no existe.`);
        }

        this.validarNota(entity.nota);

        return await this.CalificacionesRepository.updateAsync(entity);
    }

    deleteByIdAsync = async (id) => {
        return await this.CalificacionesRepository.deleteByIdAsync(id);
    }

    validarAlumnoExiste = async (idAlumno) => {
        const alumno = await this.AlumnosService.getByIdAsync(idAlumno);

        if (alumno == null) {
            throw new Error(`El alumno con id ${idAlumno} no existe.`);
        }
    }

    validarMateriaExiste = async (idMateria) => {
        const materia = await this.MateriasService.getByIdAsync(idMateria);

        if (materia == null) {
            throw new Error(`La materia con id ${idMateria} no existe.`);
        }
    }

    validarNota = (nota) => {
        if (nota < 0 || nota > 10) {
            throw new Error('La nota debe estar entre 0 y 10.');
        }
    }
}