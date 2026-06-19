export default class Calificacion {
    constructor(id_alumno, id_materia, nota, fecha = null) {
        this.id_alumno = id_alumno;
        this.id_materia = id_materia;
        this.nota = nota;
        this.fecha = fecha;
    }
}