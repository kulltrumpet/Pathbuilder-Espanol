// ==UserScript==
// @name         Pathbuilder Español
// @namespace    https://github.com/kulltrumpet/Pathbuilder-Espanol
// @version      1.00.00
// @description  Pathbuilder traducido a español
// @author       Kull Trumpet

// @match        https://2e.aonprd.com/*
// @match        https://pathbuilder2e.com/*
// @noframes

// @exclude      *://docs.google.com/*
// @exclude      *://drive.google.com/*
// @exclude      *://mail.google.com/*

// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js

// @licence      CC-BY-NC-SA-4.0; https://creativecommons.org/licenses/by-nc-sa/4.0/
// @licence      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// ==/UserScript==
/* jshint esversion: 6 */

(function () {
    'use strict';

    if(0){/*
last update: 7/04/2020

== todo ==
1. comment on iframes.
1. script execution flow with FHD.
1. separate counter for each execution instance.

10. case: 2 text nodes have the same parent block.

== issues ==
- certain text nodes aren't accessed with markCheckedElement enabled. (multiple text nodes)

== how it works ==
1a. calls processPage() once for each major run.
1b. creates list of specific text nodes then checks each against all rules.
1ba. with special replace enabled, if delete or full replace match, check stops after the first special match.
- this excludes elements previously checked.
- changes text based on matches.
1c. after checking a text node against all rules, applies a 'checked' class to the element containing the text node.

2a. dlt1 and dlt2 completely replaces text by default, option to change.

== notification notes ==
1e. elements checked by title attributes are processed in a separate block.
5a. notifications only work for those sites enabled with filters.

== version history ==
== 1.05.03 ==
- custom execution time
- some clean up.

== code markers ==
AA. initial setup
AB. replace rules
AC. special rules
BA. script options
BB. notif code block
CA. processPage()
CB. execution control
DA. script button
DB. support functions
    */}

    // ==== AA. initial setup =====================================================================|

    const scriptPrefix = "rplt-";
    const scriptTag = "RPLT";

    let runScript = 1;
    runScript = getOptionState("enable-"+ scriptPrefix +"script", runScript);

    if (runScript) {

        let enableConsoleMessages = 1; // default 0; set to 1 to show console messages.
        enableConsoleMessages = getOptionState("log-"+ scriptPrefix +"msg", enableConsoleMessages);

        let enabledMessages =
            //"MA|"+ // any rule matches
            "TT-MA|"+ // page title match.
            "TXT-MA|"+ // all text matches.
            "DLT1|"+ // delete1 matches.
            "DLT2|"+ // delete2 matches
            "FR1|"+ // full replace matches.
            //"CH-TT|"+ // changed text.

            "RUNT|"+ // runtime messages (amount of time to execute)
            "EXEC|"+ // execution messages (when code is executed)
            "\\bST\\b|"+ //script option change update
            "GEN$|"+ // general messages
            "^1"; // high priority messages
        let logAll = 0; // if 1, logs all titles from blocks.
        logAll = getOptionState("log-"+ scriptPrefix +"all", logAll);
        if (logAll) {
            enabledMessages = enabledMessages.concat("|title");
        }
        const enabledMessagesRegex = new RegExp(enabledMessages); // used in consolelog().

        consolelog("#### ("+ scriptTag +") text replace script began. ####", "EXEC");

        // ==== AB. replace rules =================================================================|

        // base rules for replacement
        let replaceRules = [
            //[//i, ""], // rule template

            // basic examples:
            //[/commit/i, "dog"],
            //[/branch/i, "turtle"],
            //[/file/i, "birdie"],
            //[/\w/g, "a"], //replaces all characters with "a".
            //[/(.|\W)+/i, "text"], //replaces all text instances with "text".

            // shield descriptions (must be here due to shield description text not being in listview-detail for some reason)
            [/Like wooden shields, steel shields come in a variety of shapes and sizes\. Though more expensive than wooden shields, they are much more durable\./i, "Como los escudos de madera, los de acero se construyen en una gran variedad de formas y tamaños. Aunque más caros que los de madera, son mucho más duraderos."],
            [/Though they come in a variety of shapes and sizes, the protection offered by wooden shields comes from the stoutness of their materials\. While wooden shields are less expensive than steel shields, they break more easily\./i, "Aunque hay una gran variedad de formas y tamaños, la protección ofrecida por los escudos de madera procede de la reciedumbre de sus materiales. Si bien los escudos de madera son más baratos que los de acero, se rompen con más facilidad."],
            [/These massive shields can be used to provide cover to nearly the entire body\. Due to their size, they are typically made of wood reinforced with metal\. Getting the higher bonus for a tower shield requires using the Take Cover action while the shield is raised\./i, "Estos enormes escudos se pueden utilizar para proporcionar cobertura a casi todo el cuerpo. Debido a su tamaño, suelen ser de madera reforzada con metal."],
            [/This very small shield is a favorite of duelists and quick, lightly armored warriors\. It's typically made of steel and strapped to your forearm\. You can Raise a Shield with your buckler as long as you have that hand free or are holding a light object that's not a weapon in that hand\./i, "Este escudo, muy pequeño, es el favorito de los duelistas y de los guerreros rápidos y provistos de armadura ligera. Típicamente está hecho de acero y va atado a tu antebrazo. Puedes Alzar un escudo con tu rodela si tienes libre dicha mano o sostienes en la misma un objeto ligero distinto de un arma."],

            // weapon trait descriptions
            [/This weapon can be wielded with two hands\. Doing so changes its weapon damage die to the indicated value\. This change applies to all the weapon's damage dice, such as those from striking runes\./i, "Esta arma se puede empuñar con ambas manos para cambiar su dado de daño al valor indicado. Este cambio se aplica a todos los dados de daño del arma."],
            [/The multiple attack penalty you take with this weapon on the second attack on your turn is -4 instead of -5, and -8 instead of -10 on the third and subsequent attacks in the turn\./i, "El penalizador por ataque múltiple que sufres con esta arma en el segundo ataque de tu turno es -4 en lugar de -5, y -8 en lugar de -10 en el tercer ataque y subsiguientes del turno."],
            [/Natural attacks with this trait can be used to attack creatures up to the listed distance away instead of only adjacent creatures\.Weapons with this trait are long and can be used to attack creatures up to 10 feet away instead of only adjacent creatures\. For creatures that already have reach with the limb or limbs that wield the weapon, the weapon increases their reach by 5 feet\./i, "Esta arma se puede utilizar para atacar a enemigos que están hasta 10 pies (3 m) de distancia en lugar de sólo a enemigos adyacentes. Para las criaturas con alcance, el arma incrementa en 5 pies (1,5 m) su alcance."],
            [/You can throw this weapon as a ranged attack, and it is a ranged weapon when thrown\. A thrown weapon adds your Strength modifier to damage just like a melee weapon does\. When this trait appears on a melee weapon, it also includes the range increment\. Ranged weapons with this trait use the range increment specified in the weapon's Range entry\./i, "Puedes arrojar esta arma como un ataque a distancia; cuando se arroja se convierte en una arma a distancia. Sumas tu modificador por Fuerza al daño como harías en un arma cuerpo a cuerpo. Cuando este rasgo aparece en un arma cuerpo a cuerpo, también incluye el incremento de rango de distancia. Las armas a distancia con este rasgo utilizan el incremento de rango de distancia que aparece en la entrada Rango de distancia del arma."],
            [/This weapon makes wide sweeping or spinning attacks, making it easier to attack multiple enemies\. When you attack with this weapon, you gain a \+1 circumstance bonus to your attack roll if you already attempted to attack a different target this turn using this weapon\./i, "Esta arma lleva a cabo ataques de barrido o de giro. Cuando atacas con esta arma, obtienes un bonificador +1 por circunstancia a tu tirada de ataque si ya has intentado atacar a un objetivo diferente este turno utilizándola."],
            [/You can use this weapon to Trip with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Trip using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Derribar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Derribar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/This weapon can be used to Trip with the Athletics skill at a distance up to the weapon's first range increment\. The skill check takes a -2 circumstance penalty\. You can add the weapon's item bonus to attack rolls as a bonus to the check\. As with using a melee weapon to trip, a ranged trip doesn't deal any damage when used to Trip\. This trait usually appears only on a thrown weapon\./i, "El arma puede utilizarse para Derribar con la habilidad Atletismo dentro del primer incremento de rango de distancia del arma. La prueba de habilidad sufre un penalizador -2 por circunstancia. Puedes sumar el modificador por objeto del arma a las tiradas de ataque como bonificador a la prueba. Un arma de derribo a distancia no inflige daño alguno cuando se utiliza para Derribar. Estas armas son por lo general arrojadizas."],
            [/You can use this weapon to Disarm with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls \(if any\) as an item bonus to the Athletics check\. If you critically fail a check to Disarm using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\. On a critical success, you still need a free hand if you want to take the item\./i, "Puedes utilizar esta arma para Desarmar con la habilidad Atletismo incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma (si lo hay) a las tiradas de ataque como bonificador por objeto a la prueba de Atletismo. Si sufres un fallo crítico en una prueba de Desarmar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico. Con un éxito crítico, sigues necesitando una mano libre si quieres recuperar el objeto."],
            [/You can use this weapon to Shove with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Shove using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Empujar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Empujar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/The fatal trait includes a die size\. On a critical hit, the weapon's damage die increases to that die size instead of the normal die size, and the weapon adds one additional damage die of the listed size\./i, "El rasgo fatal incluye un tamaño de dado. Con un impacto crítico, el dado de daño de arma se incrementa a dicho tamaño en lugar del tamaño de dado normal, y el arma suma un dado de daño adicional del tamaño indicado."],
            [/An attached weapon must be combined with another piece of gear to be used\. The trait lists what type of item the weapon must be attached to\. You must be wielding or wearing the item the weapon is attached to in order to attack with it\. For example, shield spikes are attached to a shield, allowing you to attack with the spikes instead of a shield bash, but only if you're wielding the shield\. An attached weapon is usually bolted onto or built into the item it's attached to, and typically an item can have only one weapon attached to it\. Typically the weapon can’t be used if the item it’s attached to is broken\. An attached weapon can be affixed to an item with 10 minutes of work and a successful DC 10 Crafting check; this includes the time needed to remove the weapon from a previous item, if necessary\. If an item is destroyed, its attached weapon can usually be salvaged\./i, "Una arma fijada debe combinarse con otra pieza de equipo para poderse usar. El rasgo indica a qué tipo de objeto se tiene que fijar el arma. Debes estar empuñando o llevando puesto el objeto al que el arma está fijada para atacar con ella. Por ejemplo, las púas de un escudo están fijadas al mismo, lo que te permite atacar con ellas en lugar de golpear con el escudo. Un arma fijada está por lo general atornillada al objeto o construida en el mismo, y típicamente un objeto sólo puede tener un arma fijada. Un arma fijada se puede fijar al objeto con 10 minutos de trabajo y una prueba con éxito de Artesanía CD 10; esto incluye el tiempo necesario para quitar el arma de un objeto previo, si es necesario. Si el objeto queda destruido, su arma fijada suele poderse recuperar."],
            [/These weapons are used as a pair, complementing each other\. When you attack with a twin weapon, you add a circumstance bonus to the damage roll equal to the weapon's number of damage dice if you have previously attacked with a different weapon of the same type this turn\. The weapons must be of the same type to benefit from this trait, but they don't need to have the same runes\./i, "Estas armas se utilizan por parejas. Cuando atacas con un arma gemela, sumas un bonificador por circunstancia a la tirada de daño igual al número de dados de daño del arma si ya has atacado previamente con otra arma del mismo tipo este turno. Las armas deben ser del mismo tipo, pero no hace falta que tengan las mismas runas."],
            [/The weapon is suited for mounted combat with a harness or similar means\. When mounted, if you moved at least 10 feet on the action before your attack, add a circumstance bonus to damage for that attack equal to the number of damage dice for the weapon\. In addition, while mounted, you can wield the weapon in one hand, changing the damage die to the listed value\./i, "El arma es adecuada para el combate montado, mediante un arnés o medio similar. Cuando vas montado, si has movido por lo menos 10 pies (3 m) en la acción anterior a tu ataque, suma al daño un bonificador por circunstancia para dicho ataque igual al número de dados de daño para el arma. Además, cuando vas montado puedes empuñar el arma a una mano, cambiando el dado de daño al valor indicado. Como parte de tu acción de Montar a una criatura, puedes cambiar tu agarre de una arma de justa a una mano. Después, cambiar el agarre requiere de la acción de Interactuar. Si desmontas mientras empuñas una arma de justa a una mano, puedes cambiar a usarla a dos manos como parte de dicha acción si en ese momento tienes una mano libre. Si no, estarás sosteniendo el arma en una mano, pero no empuñándola."],
            [/On a critical hit, the weapon adds a weapon damage die of the listed size\. Roll this after doubling the weapon's damage\. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune\. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit\. An ability that changes the size of the weapon's normal damage dice doesn't change the size of its deadly die\./i, "En un impacto crítico, el arma añade un dado de daño de arma del tamaño indicado. Haz esta tirada después de doblar el daño. Esto se incrementa a dos dados si el arma tiene una runa de golpe mayor y a tres dados si tiene una runa de golpe superior. Por ejemplo, una espada ropera con una runa de golpe mayor inflige 2d8 daño perforante adicional con un impacto crítico. Una aptitud que cambia el tamaño del dado de daño normal del arma no cambia el tamaño de su dado letal."],
            [/This weapon doesn't take up your hand, usually because it is built into your armor\. A free-hand weapon can't be Disarmed\. You can use the hand covered by your free-hand weapon to wield other items, perform manipulate actions, and so on\. You can't attack with a free-hand weapon if you're wielding anything in that hand or otherwise using that hand\. When you're not wielding anything and not otherwise using the hand, you can use abilities that require you to have a hand free as well as those that require you to be wielding a weapon in that hand\. Each of your hands can have only one free-hand weapon on it\./i, "Esta arma no ocupa tu mano, por lo general debido a estar incorporada a tu armadura. No se te puede desarmar de un arma de mano libre. Puedes utilizar la mano cubierta por tu arma de mano libre para empuñar otros objetos, llevar a cabo acciones de manipular, etc. No puedes atacar con un arma de mano libre si empuñas otra cosa con esa mano o la estás usando para otra cosa. Cuando no empuñas nada y no estás usando la mano para otra cosa, puedes utilizar aptitudes que requieren tener una mano libre, así como las que requieren que estés empuñando un arma en esa mano. Sólo puedes tener un arma de mano libre en cada una de tus manos."],
            [/Abilities with this trait are from the monk class\. A weapon with this trait is primarily used by monks\./i, "Aptitudes con este rasgo son de la clase monje. Un arma con este rasgo es usado primariamente por los monjes."],
            [/Attacks with this weapon are nonlethal, and are used to knock creatures unconscious instead of kill them\. You can use a nonlethal weapon to make a lethal attack with a -2 circumstance penalty\./i, "Los ataques con esta arma no son letales y se utilizan para dejar a las criaturas inconscientes en lugar de matarlas. Puedes utilizar un arma no letal para llevar a cabo un ataque letal con un penalizador -2 por circunstancia."],
            [/This weapon is designed to be inconspicuous or easily concealed\. You gain a \+2 circumstance bonus to Stealth checks and DCs to hide or conceal a weapon with this trait\./i, "Esta arma está diseñada para ser discreta o fácilmente ocultada. Obtienes un bonificador + 2 por circunstancia a las pruebas de Sigilo y a las CD para esconder u ocultar un arma con este rasgo."],
            [/This weapon can be used defensively to block attacks\. While wielding this weapon, if your proficiency with it is trained or better, you can spend a single action to position your weapon defensively, gaining a \+1 circumstance bonus to AC until the start of your next turn\./i, "Esta arma se puede utilizar defensivamente para bloquear ataques. Cuando empuñas esta arma, si tu competencia con ella es entrenado o mejor, puedes invertir una acción para colocar tu arma de forma defensiva, obteniendo un bonificador +1 por circunstancia a la CA hasta el inicio de tu siguiente turno."],
            [/You can use this weapon to Grapple with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Grapple using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Agarrar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Apresar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/You add half your Strength modifier \(if positive\) to damage rolls with a propulsive ranged weapon\. If you have a negative Strength modifier, you add your full Strength modifier instead\./i, "Sumas la mitad de tu modificador por Fuerza (si es positivo) a las tiradas de daño con una arma a distancia propulsiva. Si tienes un modificador por Fuerza negativo, en su lugar sumas tu modificador por Fuerza completo."],
            [/When you hit a flat-footed creature, this weapon deals 1 precision damage in addition to its normal damage\. The precision damage increases to 2 if the weapon is a \+3 weapon\./i, "Cuando aciertas a una criatura desprevenida, esta arma inflige 1 daño de precisión además de su daño normal. El daño de precisión se incrementa a 2 si el arma es un arma +3."],
            [/You can use the momentum from a missed attack with this weapon to lead into your next attack\. After missing with this weapon on your turn, you gain a \+1 circumstance bonus to your next attack with this weapon before the end of your turn\./i, "Puedes utilizar el impulso de un ataque fallido con esta arma para iniciar tu siguiente ataque. Tras fallar con esta arma en tu turno, obtienes un bonificador +1 por circunstancia a tu siguiente ataque con la misma antes del final de tu turno."],
            [/An unarmed attack uses your body rather than a manufactured weapon\. An unarmed attack isn't a weapon, though it's categorized with weapons for weapon groups, and it might have weapon traits\. Since it's part of your body, an unarmed attack can't be Disarmed\. It also doesn't take up a hand, though a fist or other grasping appendage generally works like a free-hand weapon\./i, "Un ataque sin armas utiliza tu cuerpo en lugar de un arma fabricada. Un ataque sin armas no es un arma, aunque pertenece a un grupo de armas y podría tener rasgos de arma. Un ataque sin armas no puede ser Desarmado. Tampoco ocupa una mano, aunque un puño u otro apéndice capaz de aferrar sigue las mismas reglas que un arma de mano libre."],
            [/You can use your Dexterity modifier instead of your Strength modifier on attack rolls using this melee weapon\. You still use your Strength modifier when calculating damage\./i, "Puedes utilizar tu modificador por Destreza en lugar de tu modificador por Fuerza en las tiradas de ataque utilizando esta arma cuerpo a cuerpo. Sigues utilizando la Fuerza para calcular el daño."],
            [/A versatile weapon can be used to deal a different type of damage than that listed in the Damage entry\. This trait indicates the alternate damage type\. For instance, a piercing weapon that is versatile S can be used to deal piercing or slashing damage\. You choose the damage type each time you make an attack\./i, "Un arma versátil se puede utilizar para infligir un tipo de daño diferente al indicado. Este rasgo indica el tipo de daño alternativo. Por ejemplo, un arma perforante con versátil Cor puede infligir daño perforante o cortante. Tú eliges el tipo de daño cada vez que atacas."],
            [/This weapon becomes more dangerous as you build momentum\. When you attack with it more than once on your turn, the second attack gains a circumstance bonus to damage equal to the number of weapon damage dice, and each subsequent attack gains a circumstance bonus to damage equal to double the number of weapon damage dice\./i, "Esta arma se hace más peligrosa conforme más impulso acumulas. Cuando atacas con ella más de una vez en tu turno, el segundo ataque obtiene un bonificador por circunstancia al daño igual al número de dados de daño de arma y cada ataque posterior obtiene un bonificador por circunstancia al daño igual al doble del número de dados de daño."],
            [/This ranged weapon is less effective at close distances\. Your attacks against targets that are at a distance within the range listed take a -2 penalty\./i, "Este ataque a distancia es menos efectivo a corta distancia. Tus ataques contra objetivos que están a una distancia dentro del incremento de rango indicado sufren un penalizador -2."],

            // critical specialization
            [/If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile\. The target is immobilized and must spend an Interact action to attempt a DC 10 Athletics check to pull the missile free; it can't move from its space until it succeeds\. The creature doesn't become stuck if it is incorporeal, is liquid \(like a water elemental or some oozes\), or could otherwise escape without effort\./i, "Si el objetivo del impacto crítico está adyacente a una superficie, se queda clavado a la misma por el proyectil. El objetivo queda inmovilizado y debe invertir una acción de Interactuar para hacer una prueba de Atletismo CD 10 y arrancar el proyectil; hasta que lo consiga no se podrá mover de su espacio. La criatura no se queda clavada si es incorporal, líquida o de alguna otra forma podría escapar sin esfuerzo (como por ejemplo siendo lo suficientemente grande como para que el proyectil no fuera un impedimento)."],
            [/The target is moved 5 feet in a direction of your choice\. This is forced movement\./i, "El objetivo es movido 5 pies (1,5 m) en una dirección elegida por ti. Éste es un movimiento forzado."],
            [/The target takes 1d8 persistent bleed damage\. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls\./i, "El objetivo sufre 1d8 daño persistente por sangrado. Obtienes un bonificador por objeto a este daño por sangrado igual al bonificador por objeto del arma a las tiradas de ataque."],
            [/Increase the radius of the bomb’s splash damage \(if any\) to 10 feet\./i, "Incrementa a 10 pies (3 m) el radio del daño por salpicadura de la bomba (si lo hay)."],
            [/You knock the target away from you up to 10 feet \(you choose the distance\)\. This is forced movement\./i, "Apartas de ti de un golpe al objetivo hasta 10 pies (3 m) en línea recta, eligiendo tú la dirección. Éste es un movimiento forzado."],
            [/The target takes 1d6 persistent bleed damage\. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls\./i, "El objetivo sufre 1d6 daño persistente por sangrado. Obtienes un bonificador por objeto a este daño por sangrado igual al bonificador por objeto del arma a las tiradas de ataque."],
            [/You knock the target back from you 5 feet\. This is forced movement\./i, "Apartas de ti de un empujón al objetivo 5 pies (1,5 m). Éste es un movimiento forzado."],
            [/The target is made off-balance by your attack, becoming off-guard until the start of your next turn\./i, "El objetivo queda desequilibrado por tu ataque, quedando desprevenido hasta el inicio de tu siguiente turno."],
            [/Choose one creature adjacent to the initial target and within reach\. If its AC is lower than your attack roll for the critical hit, you deal damage to that creature equal to a roll of your weapon’s damage die \(including extra dice for its striking rune, if any\)\. No bonuses or other additional dice apply to this damage\./i, "Elige una criatura adyacente al objetivo inicial y dentro del alcance. Si su CA es menor que el resultado de tu tirada de ataque para el impacto crítico, inflige tanto daño a dicha criatura como el resultado del dado de daño de arma que tiraste (incluyendo los dados adicionales por su runa de golpe, si hubiera). Esta cantidad no se dobla, ni se aplican bonificadores ni otros dados adicionales a este daño."],
            [/The target must succeed at a Fortitude save against your class DC or be stunned 1\./i, "El objetivo ha de tener éxito en una salvación de Fortaleza contra tu CD de clase o quedar aturdido 1."],
            [/The weapon pierces the target, weakening its attacks\. The target is clumsy 1 until the start of your next turn\./i, "Las armas de este grupo atraviesan al objetivo, debilitando sus ataques. Éste queda torpe 1 hasta el inicio de tu siguiente turno."],
            [/The target is knocked prone unless they succeed at a Reflex save against your class DC\./i, "El objetivo queda tumbado hasta que tiene éxito en una salvación de Reflejos contra tu CD de clase."],
            [/The target is knocked prone unless they succeed at a Fortitude save against your class DC\./i, "El objetivo queda tumbado hasta que tiene éxito en una salvación de Fortaleza contra tu CD de clase."],
            [/The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn\./i, "El objetivo debe tener éxito en una salvación de Fortaleza contra tu CD de clase o quedar lentificado 1 hasta el final de tu siguiente turno."],
            [/The weapon viciously pierces the target, who takes 2 additional damage per weapon damage die\./i, "El arma atraviesa cruelmente el objetivo, que sufre 2 daño adicional por dado de daño de arma."],

            // armor trait descriptions
            [/The armor covers you so completely that it provides benefits against some damaging effects\. On Reflex saves to avoid a damaging effect, such as a fireball, you add a \+3 modifier instead of your Dexterity modifier\./i, "La armadura te cubre de forma tan completa que te proporciona beneficios contra algunos efectos dañinos. A las salvaciones de Reflejos para evitar un efecto dañino, como por ejemplo una bola de fuego, sumas un modificador +3 en lugar de tu modificador por Destreza."],
            [/The armor is so comfortable that you can rest normally while wearing it\./i, "La armadura es tan cómoda que puedes descansar con normalidad mientras la llevas."],
            [/The armor is flexible enough that it doesn't hinder most actions\. You don't apply its check penalty to Acrobatics or Athletics checks\./i, "La armadura es tan flexible que no obstaculiza la mayoría de acciones. No aplicarás su penalizador a las pruebas en las de Acrobacias o Atletismo."],
            [/This armor is loud and likely to alert others to your presence\. The armor's check penalty applies to Stealth checks even if you meet the required Strength score\./i, "Esta armadura rechina y es probable que alerte a otros de tu presencia. El penalizador por armadura a las pruebas se aplica a las de Sigilo, incluso si tienes el modificador por Fuerza requerido."],

            // armor specialization
            [/The numerous overlapping pieces of this armor protect you from piercing attacks\. You gain resistance to piercing damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "Las numerosas piezas superpuestas de esta armadura te protegen de los ataques perforantes. Obtienes una resistencia al daño perforante igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],
            [/The armor is so flexible it can bend with a critical hit and absorb some of the blow\. Reduce the damage from critical hits by either 4 \+ the value of the armor’s potency rune for medium armor, or 6 \+ the value of the armor’s potency rune for heavy armor\. This can’t reduce the damage to less than the damage rolled for the hit before doubling for a critical hit\./i, "La armadura se puede doblar con un impacto crítico y absorber parte del golpe. Reduce el daño procedente de los impactos críticos en 4 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 6 + el valor de la runa de potencia de la armadura para las armaduras pesadas. Esto no puede reducir el daño a menos del obtenido para el impacto antes de doblarlo para un crítico."],
            [/The sturdy plate provides no purchase for a cutting edge\. You gain resistance to slashing damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "Las recias placas no proporcionan agarre alguno a un filo cortante. Obtienes una resistencia al daño cortante igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],
            [/The thick second skin of the armor disperses blunt force to reduce bludgeoning damage\. You gain resistance to bludgeoning damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "La gruesa segunda piel de la armadura dispersa la fuerza bruta para reducir el daño contundente. Obtienes una resistencia al daño contundente igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],

            // ancestry feature descriptions
            [/You can see in dim light as though it were bright light, and you ignore the concealed condition due to dim light\./, "Puedes ver en luz tenue como si fuera luz brillante, por lo que ignoras el estado oculto debido a la luz tenue."],
            [/You can see in darkness and dim light just as well as you can see in bright light, though your vision in darkness is in black and white\./, "Puedes ver en la oscuridad y en luz tenue igual de bien que con luz brillante, aunque tu visión en la oscuridad es en blanco y negro."],
            [/You get one clan dagger for free, as it was given to you at birth\. Selling this clan dagger is a terrible taboo and earns you the disdain of other dwarves\./, "Obtienes una daga de clan gratis, que te fue regalada cuando naciste. Vender esta daga de clan es un tabú terrible y te podría granjear el desdén de otros enanos."],
            [/Your eyes are sharp, allowing you to make out small details about concealed or even invisible creatures that others might miss\. You gain a \+2 circumstance bonus when using the Seek action to find hidden or undetected creatures within 30 feet of you\. When you target an opponent that is concealed from you or hidden from you, reduce the DC of the flat check to 3 for a concealed target or 9 for a hidden one\./, "Tu vista es aguda, permitiéndote distinguir pequeños detalles acerca de criaturas ocultas o incluso invisibles, que otros podrían pasar por alto. Obtienes un bonificador +2 por circunstancia al utilizar la acción de Buscar para encontrar criaturas escondidas o no detectadas a 30 pies (9 m) o menos de ti. Cuando designas como objetivo a un oponente que está oculto o escondido de ti, reduce la CD de la prueba plana a un 3 para un objetivo oculto o a 9 para uno escondido."],
            [/\bYou gain nourishment in the same way that the plants or fungi that match your body type normally do, through some combination of photosynthesis, absorbing minerals with your roots, or scavenging decaying matter\. You typically do not need to pay for food\. If you normally rely on photosynthesis and go without sunlight for 1 week, you begin to starve\. You can derive nourishment from specially formulated bottles of sunlight instead of natural sunlight, but these bottles cost 10 times as much as standard rations \(or 40 sp\)\./i, "Te nutres de la misma forma que las plantas o los hongos que encajan con tu tipo de cuerpo, mediante alguna combinación de fotosíntesis, absorbiendo minerales con tus raíces o forrajeando materia orgánica en descomposición. Lo normal es que no tengas que pagar por la comida. Si sueles basarte en la fotosíntesis y pasas 1 semana aislado de la luz del sol, empiezas a pasar hambre. Tu sustento puede provenir de unas botellas especialmente formuladas de luz solar en lugar de la luz natural, pero estas botellas cuestan 10 veces más que las raciones estándar (es decir, unas 40 pp)."],

            // various Pathbuilder text
            [/\bHide Plan\b/, "Ocultar plan"],
            [/\bShow Plan\b/, "Mostrar plan"],
            [/\bAlert!/i, "¡Alerta!"],
            [/Remaining Skill Selections/, "Elecciones de habilidad restantes"],
            [/\bEquipment Information\b/i, "Información sobre el equipo"],
            [/\bProficiency Information\b/i, "Información sobre competencia"],
            [/\bInformation\b/i, "Información"],
            [/\bContainer Options\b/i, "Opciones de recipiente"],
            [/\bSet XP\b/, "Poner PX"],
            [/\bSet Character Level\b/, "Poner el nivel del personaje"],
            [/\bSet Hit Points\b/, "Poner puntos de golpe"],
            [/\bHP Damage\b/, "PG de daño"],
            [/\bHP Healed\b/, "PG curados"],
            [/You can set the new total directly or use the \+ or - symbols to adjust\./, "Puedes poner el total nuevo directamente o usar los símbolos + o - para ajustar."],
            [/\bApply Condition\b/, "Añadir estado"],
            [/\bCustom Buffs\b/, "Mejoras personalizadas"],
            [/Really buy/, "¿Realmente quieres comprar"],
            [/Warning: this will simplify your coins\./, "Aviso: va a simplificar tus monedas."],
            [/Really delete this weapon\?/i, "¿Realmente quieres borrar esta arma?"],
            [/Really stow this weapon to the gear tab\?/i, "¿Realmente quieres guardar esta arma en la pestaña 'Equipo'?"],
            [/Really stow this armor to the gear tab\?/i, "¿Realmente quieres guardar esta armadura en la pestaña 'Equipo'?"],
            [/Really remove this shield from your character\?/i, "¿Realmente quieres quitar este escudo de tu personaje?"],
            [/Really stow your shield to the gear tab\?/i, "¿Realmente quieres guardar tu escudo en la pestaña 'Equipo'?"],
            [/Really restore this item to the armor or weapon tab\?/i, "¿Realmente quieres restaurar este objeto a la pestaña 'Defensa' o 'Armas'?"],
            [/Really swap this item with/i, "¿Realmente quieres intercambiar este objeto por"],
            [/currently equipped/i, "actualmente llevado"],
            [/Really remove/i, "¿Realmente quieres quitar"],
            [/from your equipment\?/i, "de tu equipo?"],
            [/from your formula list\?/i, "de tu lista de fórmulas?"],
            [/Custom Weapon/, "Arma personalizada"],
            [/Weapon Name/, "Nombre del arma"],
            [/No item level/, "Sin nivel de objeto"],
            [/Traits \(comma separated\)/, "Rasgos (separados por coma)"],
            [/Ranged Weapon/, "Arma a distancia"],
            [/Damage Dice/, "Dados de daño"],
            [/Damage Type/, "Tipo de daño"],
            [/numeric only/, "solo números"],
            [/leave blank for none/, "déjalo en blanco si no hay"],
            [/\bDescription\b/, "Descripción"],
            [/\bSource\b/, "Fuente"],
            [/Action description \(Leave blank for no action\)/, "Descripción de la acción (déjalo en blanco si no hay acción)"],

            [/\bBonus Spells\b/, "Conjuros adicionales"],

            [/Animal Companions, Eidolons, Constructs and Familiars are gained from feats and class features\. You do not have an Animal Companion, Eidolon or Familiar at this level\./i, "Los compañeros animales, ídolos, constructos y familiares se obtiene por dotes y rasgos de clase. En este nivel no tienes compañero animal, ídolo o familiar."],
            [/Animal Companions, Eidolons, Constructs and Familiars are only available in the fully unlocked version of this app\./i, "Los compañeros animales, ídolos, constructos y familiares solo son disponibles en la versión desbloqueada de esta app."],

            [/\bAge\b/, "Edad"],
            [/\bGender\b/, "Género"],
            [/\bNot set\b/, "No puesto"],
            [/\bNone selected\b/, "Ningunos seleccionados"],
            [/\bNot Selected\b/, "No seleccionado"],
            [/\bSet Languages\b/, "Poner idiomas"],
            [/\bCommon Languages\b/, "Idiomas comunes"],
            [/\bUncommon Languages\b/, "Idiomas poco comunes"],
            [/\bRare Languages\b/, "Idiomas raros"],
            [/\bSecret Languages\b/, "Idiomas secretos"],
            [/\bCustom Languages\b/, "Idiomas personalizados"],
            [/\bLanguages\b/, "Idiomas"],
            [/\byour Intelligence modifier \(if it(’|')s positive\)\./i, "tu modificador por Inteligencia (si es positivo)."],
            [/Additional languages equal to/i, "Tantos idiomas adicionales como"],
            [/\bChoose from\b/, "Elige entre"],
            [/and any other languages to which you have access \(such as the languages prevalent in your region\)\./i, "y cualquier otro idioma al que tienes acceso (por ejemplo, los predominantes en tu región)."],
            [/\bBonus languages\b/, "Idiomas adicionales"],
            [/Humans, dwarves, elves, halflings, and other common ancestries/, "Humanos, enanos, elfos, medianos y otras ascendencias comunes"],
            [/Dragons, reptilian humanoids/, "Dragones, humanoides reptilianos"],
            [/Fey, centaurs, plant and fungus creatures/, "Hadas, centauros, criaturas del tipo planta y hongo"],
            [/Giants, ogres, trolls, cyclopes/, "Gigantes, ogros, troles, cíclopes"],
            [/Subterranean civilizations, serpentfolk/, "Civilizaciones subterráneas, hombres serpiente"],
            [/Evil fey, otherworldly monsters/, "Hadas malignas, monstruos de otro mundo"],
            [/\bDemons\b/, "Demonios"],
            [/\bDevils\b/, "Diablos"],
            [/Angels and other celestials/, "Ángeles y otros celestiales"],
            [/The hyena-like kholos/, "Los kholos, que tienen forma de hiena"],
            [/Wood elemental creatures/, "Criaturas elementales de madera"],
            [/Nidalese, Shadow Plane creatures/, "Nidaleses, criaturas del Inframundo"],
            [/Ghouls, intelligent undead/, "Guls, muertos vivientes inteligentes"],
            [/Earth elemental creatures/, "Criaturas elementales de tierra"],
            [/Fire elemental creatures/, "Criaturas elementales de fuego"],
            [/Air elemental creatures, flying creatures/, "Criaturas elementales de aire, criaturas voladoras"],
            [/Metal elemental creatures/, "Criaturas elementales de metal"],
            [/Aquatic creatures, water elemental/, "Criaturas acuáticas, criaturas elementales de agua"],
            [/\bDruids\b/, "Druidas"],
            [/\bSave Notes\b/, "Guardar notas"],

            [/\bChthonian\b/, "Chthoniano"],
            [/\bDiabolic\b/, "Diabólico"],
            [/\bDraconic\b/, "Dracónico"],
            [/\bEmpyrean\b/, "Empíreo"],
            [/\bFey\b/, "Feérico"],
            [/\bGnomish\b/, "Gnomo"],
            [/\bOrcish\b/, "Orco"],
            [/\bPetran\b/, "Petrano"],
            [/\bPyric\b/, "Pírico"],
            [/\bShadowtongue\b/, "Lengua sombría"],
            [/\bSussuran\b/, "Sussurano"],
            [/\bTaldane\b/, "Taldano"],
            [/\bThalassic\b/, "Talásico"],

            [/You have not yet assigned level/i, "Aún no has asignado las mejoras de atributo de nivel"],
            [/ability boosts in your character plan/i, "en tu plan del personaje"],
            [/\bunselected feats up to this level in your character plan\b/i, "dotes no seleccionadas hasta tu nivel actual en tu plan del personaje"],
            [/\bGeneral Feats\b/, "Dotes generales"],
            [/\bSkill Feats\b/, "Dotes de habilidad"],
            [/\bVersatile Heritage Feats\b/, "Dotes de herencia versátil"],

            [/\bElf Feats\b/, "Dotes de elfo"],
            [/\bDwarf Feats\b/, "Dotes de enano"],
            [/\bGnome Feats\b/, "Dotes de gnomo"],
            [/\bGoblin Feats\b/, "Dotes de goblin"],
            [/\bHuman Feats\b/, "Dotes de humano"],
            [/\bLeshy Feats\b/, "Dotes de leshy"],
            [/\bHalfling Feats\b/, "Dotes de mediano"],
            [/\bOrc Feats\b/, "Dotes de orco"],
            [/\bCatfolk Feats\b/, "Dotes de felino"],
            [/\bHobgoblin Feats\b/, "Dotes de hobgoblin"],
            [/\bKobold Feats\b/, "Dotes de kobold"],
            [/\bLizardfolk Feats\b/, "Dotes de lagarto"],
            [/\bRatfolk Feats\b/, "Dotes de rata"],
            [/\bTengu Feats\b/, "Dotes de tengu"],

            [/\bBard Feats\b/, "Dotes de bardo"],
            [/\bCleric Feats\b/, "Dotes de clérigo"],
            [/\bDruid Feats\b/, "Dotes de druida"],
            [/\bFighter Feats\b/, "Dotes de guerrero"],
            [/\bRanger Feats\b/, "Dotes de explorador"],
            [/\bRogue Feats\b/, "Dotes de pícaro"],
            [/\bWitch Feats\b/, "Dotes de brujo"],
            [/\bWizard Feats\b/, "Dotes de mago"],
            [/\bAlchemist Feats\b/, "Dotes de alquimista"],
            [/\bBarbarian Feats\b/, "Dotes de bárbaro"],
            [/\bChampion Feats\b/, "Dotes de campeón"],
            [/\bInvestigator Feats\b/, "Dotes de investigador"],
            [/\bMonk Feats\b/, "Dotes de monje"],
            [/\bOracle Feats\b/, "Dotes de oráculo"],
            [/\bSorcerer Feats\b/, "Dotes de hechicero"],
            [/\bSwashbuckler Feats\b/, "Dotes de espadachín"],

            // triggers, prerequisites etc. Anything that is next to bold text
            [/at least one innate spell gained from an elf ancestry feat\./, "por lo menos un conjuro innato obtenido de una dote de ascendencia de elfo."],
            [/at least 100 years old/, "por lo menos cien años de edad"],
            [/You are within 30 feet of an ally with the dying condition\./, "Estás a 30 pies (9 m) o menos de un aliado con el estado moribundo."],
            [/Your GM can add appropriate creature traits to the ancestral foes list if your character is from a community that commonly fights other types of enemies\./, "Tu DJ puede añadir rasgos de criatura apropiados a la lista de enemigos ancestrales si tu personaje pertenece a una comunidad que lucha comúnmente contra otros tipos de enemigos."],
            [/ty Crafting skill feat for stonemasonry\./, " para la cantería."],
            [/\btrained in\b/, "rango entrenado en"],
            [/\bexpert in\b/, "rango experto en"],
            [/\bmaster in\b/, "rango maestro en"],
            [/\blegendary in\b/, "rango legendario en"],
            [/\blegendary Stealth\b/, "Sigilo a rango legendario"],
            [/You are standing on a stone or earthen surface\./, "Estás de pie sobre una superficie de piedra o de tierra."],
            [/You are struck by a critical hit that deals physical damage\./, "Sufres un impacto crítico que inflige daño físico."],
            [/An enemy or hazard's effect hits you or you fail a Fortitude save against one\./, "El efecto de un enemigo o de un peligro te impacta, o fallas una salvación de Fortaleza contra uno de ellos."],
            [/You blind or dazzle a creature\./, "Ciegas o deslumbras a una criatura."],
            [/focus pool, at least one innate spell from a gnome heritage or ancestry feat that shares a tradition with at least one of your focus spells/, "reserva de foco, por lo menos un conjuro innato de una herencia o dote de ascendencia de gnomo que comparte una tradición con por lo menos uno de tus conjuros de foco"],
            [/at least one primal innate spell/, "por lo menos un conjuro innato primigenio."],
            [/at least one arcane or occult innate spell gained from a gnome heritage or gnome ancestry feat/, "por lo menos un conjuro innato arcano u ocultista obtenido gracias a una herencia de gnomo o dote de ascendencia de gnomo"],
            [/You must be adjacent to a living creature\./, "Tienes que estar adyacente a una criatura viva."],
            [/You are attacked by a foe, but they haven't rolled yet\./, "Eres atacado por un enemigo, pero éste aún no ha tirado los dados."],
            [/The target takes a –1 status penalty to Perception checks and Will saves for 1 minute\./, "El objetivo sufre un penalizador -1 por estatus a las pruebas de Percepción y a las salvaciones de Voluntad durante 1 minuto."],
            [/The target takes a –1 status penalty to Perception checks and Will saves for 1 round\./, "El objetivo sufre un penalizador -1 por estatus a las pruebas de Percepción y a las salvaciones de Voluntad durante 1 asalto."],
            [/The target is temporarily immune to Goblin Song for 1 hour\./, "El objetivo queda temporalmente inmune a la Canción goblin durante 1 hora."],
            [/An ally ends a move action adjacent to you\./, "Un aliado acaba una acción de movimiento adyacente a ti."],
            [/Your last action was a successful Strike and you have a free hand\./, "Tu última acción ha sido un Golpe con éxito y tienes una mano libre."],
            [/You can use this action without a free hand if your preceding Strike was made with your jaws or a similar unarmed attack you could use to hang on\. The GM determines which unarmed attacks apply\. Hanging on in this way prevents you from using that unarmed attack\./, "Puedes utilizar esta acción sin una mano libre si tu Golpe anterior lo has hecho con las mandíbulas o un ataque sin armas similar que podrías utilizar para aferrarte. El DJ determina qué ataques sin armas pueden aplicar para esto. Aferrarte de esta forma te impide utilizar dicho ataque sin armas."],
            [/You can select this feat multiple times, choosing a different feat each time\./, "Puedes seleccionar esta dote en múltiples ocasiones, eligiendo una dote diferente cada vez."],
            [/spellcasting class feature/, "rasgo de clase lanzamiento de conjuros"],
            [/can cast 3rd-rank spells/, "poder lanzar conjuros de 3.er rango"],
            [/You attempt a check using a skill you're untrained in\./, "Haces una prueba utilizando una habilidad en la que no estás entrenado."],
            [/You lose the dying condition\./, "Pierdes el estado moribundo."],
            [/You attempt a saving throw against a spell or magical effect, but haven't rolled yet\./, "Haces una tirada de salvación contra un conjuro o un efecto mágico, pero aún no has tirado los dados."],
            [/leaf leshy heritage or Cat Fall skill feat/, "herencia leshy de las hojas o dote de habilidad Caída de gato"],
            [/You're on a solid surface/, "Estás sobre una superficie sólida"],
            [/You send your roots into or across the ground, making it harder for you to stumble\. Until you move, you gain a \+2 circumstance bonus to your Fortitude or Reflex DC against attempts to Reposition, Shove, or Trip you \(or a \+4 circumstance bonus if you're a root leshy\)\. This bonus also applies to saving throws against spells or effects that attempt to move you or knock you prone\. If an effect forces you to move, you move only half the normal distance, as some of the effort goes to tearing loose the roots\./, "Clavas tus raíces en el terreno o cruzas el mismo con ellas, por lo que será más difícil que tropieces. Hasta que te muevas, obtendrás un bonificador +2 por circunstancia a tu CD de Fortaleza o de Reflejos contra los intentos de Reposicionarte, Empujarte o Derribarte (o un bonificador +4 por circunstancia si eres un leshy de las raíces). Este bonificador también se aplica a las tiradas de salvación contra conjuros o efectos que intentan moverte o tumbarte. Si un efecto te obliga a moverte, sólo te mueves la mitad de la distancia normal, puesto que parte del esfuerzo se tiene que dedicar a arrancar las raíces."],
            [/You secrete a cloak of concentrated poison that harms any who dare attack you\. For 1 minute, any creature that touches you or damages you with an unarmed attack or melee weapon without the reach trait takes 3d6 poison damage\./, "Segregas una capa de veneno concentrado que daña a cualquiera que se atreve a atacarte. Durante 1 minuto, toda criatura que toca o te daña con un ataque sin armas o una arma cuerpo a cuerpo sin el rasgo alcance sufre 3d6 daño por veneno."],
            [/You fail a skill check or saving throw\./, "Fallas una prueba de habilidad o una tirada de salvación."],
            [/A Large or larger enemy ends a move action adjacent to you/, "Un enemigo Grande o mayor acaba una acción de movimiento adyacente a ti"],
            [/You successfully use Stealth to Hide and become hidden from all your current foes, or use Stealth to Sneak and become undetected to all your current foes/, "Utilizas con éxito Sigilo para Esconderte y permanecer escondido de todos tus enemigos actuales, o bien utilizas Sigilo para Moverte furtivamente y quedar no detectado ante todos tus enemigos actuales"],
            [/You would be reduced to 0 Hit Points but not immediately killed/, "Quedarías reducido a 0 Puntos de Golpe pero no morirías de inmediato"],
            [/Burning Sun/, "Sol ardiente"],
            [/Death's Head/, "Calavera"],
            [/Defiled Corpse/, "Cadáver profanado"],
            [/Empty Hand/, "Mano vacía"],
            [/You attempt a saving throw against a spell or magical effect, and have not yet rolled/, "Haces una tirada de salvación contra un conjuro o un efecto mágico, pero aún no has tirado los dados"],
            [/animal companion, Pet, or Bonded Animal/, "compañero animal, Mascota o Animal vinculado"],
            [/You use Orc Ferocity./, "Utilizas Ferocidad de orco"],
            [/You can take this feat only at 1st level, and you can't retrain into this feat\. You can retrain out of this feat only through drastic measures, such as breaking, filing, or extracting your tusks\./, "Sólo puedes adquirir esta dote a 1.er nivel, y no puedes reconvertir otra dote en ésta. Sólo puedes reconvertir esta dote mediante medidas drásticas, como por ejemplo rompiendo, limando o extrayendo tus colmillos."],
            [/Hag claws can develop at any point in a changeling's life\. You can select this feat anytime you would gain an ancestry feat, but you can't retrain out of it\./, "Las garras de saga pueden desarrollarse en cualquier momento de la vida de un changeling. Puedes seleccionar esta dote siempre que puedes obtener una dote de ascendencia, pero no puedes reconvertirla."],
            [/claw unarmed attack/, "ataque sin armas de garra"],
            [/\bCuckoo Hag\b/, "Saga chiflada"],
            [/Iron Hag/, "Saga de hierro"],
            [/\bSea Hag\b/, "Saga marina"],
            [/\bSweet Hag\b/, "Saga dulce"],
            [/The Speed increase from this feat isn't cumulative with any Speed increase from other ancestry feats./, "El incremento de Velocidad debido a esta dote no es acumulativo con ningún incremento de Velocidad debido a otras dotes de ascendencia."],
            [/Angelkin, Lawbringer, Musetouched, or another lineage feat associated with celestials/, "Angélico, Legislador, Tocado por las musas o cualquier dote de linaje asociada con los celestiales."],
            [/Grimspawn, Pitborn, Hellspawn, or another lineage feat associated with fiends\./, "Prole infernal, Engendro macabro o Nacido del foso u otra dote de linaje asociada con infernales o con el Maelstrom."],
            [/Grimspawn, Pitborn, or Hellspawn, or another lineage feat associated with fiends or the Maelstrom/, "Prole infernal, Engendro macabro o Nacido del foso u otra dote de linaje asociada con infernales o con el Maelstrom."],
            [/any nephilim lineage feat/, "cualquier dote de linaje de nefilim"],
            [/You can take this feat only at 1st level, and you can't retrain out of this feat or into this feat/, "Sólo puedes seleccionar esta dote a 1.er nivel y no puedes, ni reconvertir otra dote en ella, ni reconvertirla en otra dote"],
            [/You can select this feat only at 1st level, and you can't retrain into or out of this feat/, "Sólo puedes seleccionar esta dote a 1.er nivel y no puedes, ni reconvertir otra dote en ella, ni reconvertirla en otra dote"],
            [/nor can you change the type of attack you gained\./, "tampoco puedes cambiar el tipo de ataque obtenido."],

            // individual words/terms

            // ancestry feats
            [/\bAncestry Feat\b/, "Dote de ascendencia"],
            [/\bForlorn\b/, "Abandonado"],
            [/\bNimble Elf\b/, "Elfo ágil"],
            [/\bElven Weapon Familiarity\b/, "Familiaridad con las armas de los elfos"],
            [/\bAncestral Longevity\b/, "Longevidad ancestral"],
            [/\bOtherworldly Magic\b/, "Magia de otro mundo"],
            [/\bElven Lore\b/, "Saber de los elfos"],
            [/\bUnwavering Mien\b/, "Semblante decidido"],
            [/\bMartial Experience\b/, "Experiencia marcial"],
            [/\bAgeless Patience\b/, "Paciencia intemporal"],
            [/\bAncestral Suspicion\b/, "Sospecha ancestral"],
            [/\bExpert Longevity\b/, "Longevidad experta"],
            [/\bElf Step\b/, "Paso elfo"],
            [/\bOtherworldly Acumen\b/, "Perspicacia de otro mundo"],
            [/\bTree Climber\b/, "Trepador de árboles"],
            [/\bUniversal Longevity\b/, "Longevidad universal"],
            [/\bAvenge Ally\b/, "Vengar aliado"],
            [/\bMagic Rider\b/, "Viajero mágico"],
            [/\bRock Runner\b/, "Corredor de las rocas"],
            [/\bMountain Strategy\b/, "Estrategia de la montaña"],
            [/\bDwarven Weapon Familiarity\b/, "Familiaridad con las armas de los enanos"],
            [/\bUnburdened Iron\b/, "No impedido por el hierro"],
            [/\bStonemason's Eye\b/, "Ojo del cantero"],
            [/\bDwarven Lore\b/, "Saber de los enanos"],
            [/\bDwarven Doughtiness\b/, "Valentía enana"],
            [/\bDefy the Darkness\b/, "Desafiar la oscuridad"],
            [/\bDwarven Reinforcement\b/, "Refuerzo enano"],
            [/\bBoulder Roll\b/, "Rodar la roca"],
            [/\bStonewalker\b/, "Caminante de la piedra"],
            [/\bMountain's Stoutness\b/, "Corpulencia de la montaña"],
            [/\bEchoes in Stone\b/, "Ecos en la piedra"],
            [/\bStone Bones\b/, "Huesos de piedra"],
            [/\bTelluric Power\b/, "Poder telúrico"],
            [/\bMarch the Mines\b/, "Recorrer las minas"],
            [/\bStonewall\b/, "Muro de roca"],
            [/\bStonegate\b/, "Puerta de roca"],
            [/\bFey Fellowship\b/, "Camaradería feérica"],
            [/\bAnimal Accomplice\b/, "Cómplice animal"],
            [/\bRazzle-Dazzle\b/, "Escándalo"],
            [/\bGnome Weapon Familiarity\b/, "Familiaridad con las armas de los gnomos"],
            [/\bFirst World Magic\b/, "Magia del primer mundo"],
            [/\bGnome Obsession\b/, "Obsesión de gnomo"],
            [/\bAnimal Elocutionist\b/, "Profesor de elocución de animales"],
            [/\bIllusion Sense\b/, "Sentido de la ilusión"],
            [/\bEnergized Font\b/, "Fuente energizada"],
            [/\bProject Persona\b/, "Proyectar persona"],
            [/\bFirst World Adept\b/, "Adepto del primer mundo"],
            [/\bVivacious Conduit\b/, "Conducto vivaz"],
            [/\bCautious Curiosity\b/, "Curiosidad cautelosa"],
            [/\bLife Leap\b/, "Salto vital"],
            [/\bInstinctive Obfuscation\b/, "Ofuscación instintiva"],
            [/\bHomeward Bound\b/, "De vuelta a casa"],
            [/\bBurn It!/, "¡Quemadlo!"],
            [/\bGoblin Song\b/, "Canción goblin"],
            [/\bCity Scavenger\b/, "Carroñero urbano"],
            [/\bGoblin Weapon Familiarity\b/, "Familiaridad con las armas de los goblins"],
            [/\bGoblin Scuttle\b/, "Huida goblin"],
            [/\bRough Rider\b/, "Jinete experto"],
            [/\bVery Sneaky\b/, "Muy escurridizo"],
            [/\bGoblin Lore\b/, "Saber de los goblins"],
            [/\bJunk Tinker\b/, "Trastear con la chatarra"],
            [/\bLoud Singer\b/, "Cantar a voces"],
            [/\bKneecap\b/, "Rodilla"],
            [/\bVandal\b/, "Vándalo"],
            [/\bCling\b/, "Aferrarse"],
            [/\bSkittering Scuttle\b/, "Huida a la carrera"],
            [/\bCave Climber\b/, "Trepador de cueva"],
            [/\bVery, Very Sneaky\b/, "Muy, muy escurridizo"],
            [/\bReckless Abandon\b/, "Abandono temerario"],
            [/\bNatural Ambition\b/, "Ambición natural"],
            [/\bUnconventional Weaponry\b/, "Armas poco convencionales"],
            [/\bGeneral Training\b/, "Entrenamiento general"],
            [/\bNatural Skill\b/, "Habilidad natural"],
            [/\bCooperative Nature\b/, "Naturaleza cooperativa"],
            [/\bHaughty Obstinacy\b/, "Obstinación altanera"],
            [/\bAdapted Cantrip\b/, "Truco adaptado"],
            [/\bAdaptive Adept\b/, "Adepto adaptativo"],
            [/\bClever Improviser\b/, "Improvisador astuto"],
            [/\bSense Allies\b/, "Sentir aliados"],
            [/\bCooperative Soul\b/, "Alma cooperativa"],
            [/\bIncredible Improvisation\b/, "Improvisación sensacional"],
            [/\bMultitalented\b/, "Polifacético"],
            [/\bGroup Aid\b/, "Prestar ayuda en grupo"],
            [/\bHardy Traveler\b/, "Viajero robusto"],
            [/\bAdvanced General Training\b/, "Entrenamiento general avanzado"],
            [/\bStubborn Persistence\b/, "Persistencia tozuda"],
            [/\bBounce Back\b/, "Rebotar"],
            [/\bHeroic Presence\b/, "Presencia heroica"],
            [/\bGrasping Reach\b/, "Alcance prensil"],
            [/\bHarmlessly Cute\b/, "Inofensivamente bello"],
            [/\bUndaunted\b/, "Intrépido"],
            [/\bLeshy Lore\b/, "Saber de los leshys"],
            [/\bShadow of the Wilds\b/, "Sombra de las tierras salvajes"],
            [/\bLeshy Superstition\b/, "Superstición leshy"],
            [/\bSeedpod\b/, "Tegumento"],
            [/\bSpeak with Kindred\b/, "Hablar con parientes"],
            [/\bLeshy Glider\b/, "Leshy planeador"],
            [/\bAnchoring Roots\b/, "Raíces anclantes"],
            [/\bRitual Reversion\b/, "Reversión ritual"],
            [/\bBark and Tendril\b/, "Corteza y zarcillo"],
            [/\bLucky Keepsake\b/, "Recuerdo afortunado"],
            [/\bSolar Rejuvenation\b/, "Rejuvenecimiento solar"],
            [/\bThorned Seedpod\b/, "Tegumento espinoso"],
            [/\bCloak of Poison\b/, "Capa de veneno"],
            [/\bCall of the Green Man\b/, "Llamada del hombre verde"],
            [/\bFlourish and Ruin\b/, "Florecimiento y ruina"],
            [/\bRegrowth\b/, "Recrecimiento"],
            [/\bFolksy Patter\b/, "Cháchara rústica"],
            [/\bHalfling Weapon Familiarity\b/, "Familiaridad con las armas de los medianos"],
            [/\bPrairie Rider\b/, "Jinete de la pradera"],
            [/\bUnfettered Halfling\b/, "Mediano sin restricciones"],
            [/\bWatchful Halfling\b/, "Mediano vigilante"],
            [/\bSure Feet\b/, "Pies seguros"],
            [/\bHalfling Lore\b/, "Saber de los medianos"],
            [/\bDistracting Shadows\b/, "Sombras distractoras"],
            [/\bHalfling Luck\b/, "Suerte del mediano"],
            [/\bTitan Slinger\b/, "Titán de la honda"],
            [/\bCultural Adaptability\b/, "Adaptabilidad cultural"],
            [/\bStep Lively\b/, "Pisada vivaz"],
            [/\bDance Underfoot\b/, "Bailar bajo los pies"],
            [/\bIrrepressible\b/, "Irreprimible"],
            [/\bUnhampered Passage\b/, "Paso sin obstáculos"],
            [/\bGuiding Luck\b/, "Suerte que guía"],
            [/\bToppling Dance\b/, "Danza derribadora"],
            [/\bCeaseless Shadows\b/, "Sombras incesantes"],
            [/\bShadow Self\b/, "Yo sombrío"],
            [/\bBeast Trainer\b/, "Adiestrador de bestias"],
            [/\bTusks\b/, "Colmillos"],
            [/\bOrc Weapon Familiarity\b/, "Familiaridad con las armas de los orcos"],
            [/\bOrc Ferocity\b/, "Ferocidad de orco"],
            [/\bHold Mark\b/, "Marca del clan"],
            [/\bIron Fists\b/, "Puños de hierro"],
            [/\bOrc Lore\b/, "Saber de los orcos"],
            [/\bOrc Superstition\b/, "Superstición de orco"],
            [/\bDefy Death\b/, "Desafiar a la muerte"],
            [/\bBloody Blows\b/, "Golpes sangrientos"],
            [/\bScar-Thick Skin\b/, "Piel cicatricial"],
            [/\bAthletic Might\b/, "Poder atlético"],
            [/\bUndying Ferocity\b/, "Ferocidad inmortal"],
            [/\bPervasive Superstition\b/, "Superstición dominante"],
            [/\bFerocious Beasts\b/, "Bestias feroces"],
            [/\bSpell Devourer\b/, "Devorador de conjuros"],
            [/\bIncredible Ferocity\b/, "Ferocidad sensacional"],
            [/\bRampaging Ferocity\b/, "Ferocidad desatada"],

            // versatile heritage feats
            [/\bCallow May\b/, "Maia bisoña"],
            [/\bSlag May\b/, "Maia ferrosa"],
            [/\bDream May\b/, "Maia onírica"],
            [/\bBrine May\b/, "Maia salina"],
            [/\bHag Claws\b/, "Garras de saga"],
            [/\bChangeling lore\b/, "Saber de los changelings"],
            [/\bHag's Sight\b/, "Vista de saga"],
            [/\bCalled\b/, "Convocado"],
            [/\bMist Child\b/, "Hijo de la bruma"],
            [/\bAccursed Claws\b/, "Garras malditas"],
            [/\bOccult Resistance\b/, "Resistencia al ocultismo"],
            [/\bHag Magic\b/, "Magia de saga"],
            [/\bAngelkin\b/, "Angélico"],
            [/\bGrimspawn\b/, "Engendro macabro"],
            [/\bLawbringer\b/, "Legislador"],
            [/\bPitborn\b/, "Nacido del foso"],
            [/\bHellspawn\b/, "Prole infernal"],
            [/\bMusetouched\b/, "Tocado por las musas"],
            [/\bBestial Manifestation\b/, "Manifestación bestial"],
            [/\bNephilim Eyes\b/, "Ojos de nefilim"],
            [/\bNimble Hooves\b/, "Pezuñas ágiles"],
            [/\bNephilim Lore\b/, "Saber de nefilim"],
            [/\bSkillful Tail\b/, "Cola hábil"],
            [/\bNephilim Resistance\b/, "Resistencia de nefilim"],
            [/\bBlessed Blood\b/, "Sangre bendita"],
            [/\bExtraplanar Supplication\b/, "Súplica extraplanaria"],
            [/\bScion of Many Planes\b/, "Vástago de muchos planos"],
            [/\bDivine Wings\b/, "Alas divinas"],
            [/\bDivine Countermeasures\b/, "Contramedidas divinas"],
            [/\bCelestial Magic\b/, "Magia celestial"],
            [/\bFiendish Magic\b/, "Magia infernal"],
            [/\bSummon Nephilim Kin\b/, "Convocar a un pariente nefilim"],
            [/\bSlip Sideways\b/, "Deslizarse de lado"],
            [/\bCelestial Mercy\b/, "Misericordia celestial"],
            [/\bEternal Wings\b/, "Alas eternas"],
            [/\bDivine Declaration\b/, "Declaración divina"],
            [/\bElf Atavism\b/, "Atavismo élfico"],
            [/\bEarned Glory\b/, "Gloria merecida"],
            [/\bSupernatural Charm\b/, "Encanto sobrenatural"],
            [/\bInspire Imitation\b/, "Inspirar imitación"],
            [/\bMonstrous Peacemaker\b/, "Pacificador monstruoso"],
            [/\bOrc Sight\b/, "Vista de orco"],

            // class features
            [/\bReflex Expertise\b/, "Experiencia en Reflejos"],
            [/\bFortitude Expertise\b/, "Experiencia en Fortaleza"],
            [/\bWill Expertise\b/, "Experiencia en Voluntad"],
            [/\bPerception Expertise\b/, "Experiencia en Percepción"],
            [/\bReflex Mastery\b/, "Maestría en Reflejos"],
            [/\bFortitude Mastery\b/, "Maestría en Fortaleza"],
            [/\bWill Mastery\b/, "Maestría en Voluntad"],
            [/\bPerception Mastery\b/, "Maestría en Percepción"],
            [/\bPerception Legend\b/, "Leyenda en Percepción"],
            [/\bMartial Weapon Expertise\b/, "Experiencia en armas marciales"],
            [/\bBard Weapon Expertise\b/, "Experiencia con las armas de bardo"],
            [/\bRanger Weapon Expertise\b/, "Experiencia en armas de explorador"],
            [/\bWeapon Expertise\b/, "Experiencia en armas"],
            [/\bLight Armor Expertise\b/, "Experiencia en armadura ligera"],
            [/\bMedium Armor Expertise\b/, "Experiencia en armadura intermedia"],
            [/\bArmor Expertise\b/, "Experiencia en armadura"],
            [/\bMartial Weapon Mastery\b/, "Maestría en armas marciales"],
            [/\bLight Armor Mastery\b/, "Maestría en armadura ligera"],
            [/\bMedium Armor Mastery\b/, "Maestría en armadura intermedia"],
            [/\bArmor Mastery\b/, "Maestría en armadura"],
            [/\bGreater Weapon Specialization\b/, "Especialización mayor en armas"],
            [/\bWeapon Specialization\b/, "Especialización en armas"],
            [/\bExpert Spellcaster\b/, "Lanzador de conjuros experto"],
            [/\bMaster Spellcaster\b/, "Lanzador de conjuros maestro"],
            [/\bLegendary Spellcaster\b/, "Lanzador de conjuros legendario"],
            [/\bSignature Spells\b/, "Conjuros de signatura"],
            [/\bDefensive Robes\b/, "Ropajes defensivos"],
            [/\bFree Feat\b/, "Dote gratuita"],
            [/\bBard Spellcasting\b/, "Lanzamiento de conjuros de bardo"],
            [/\bComposition Spells\b/, "Conjuros de composición"],
            [/\bComposition Cantrips\b/, "Trucos de composición"],
            [/\bMuse Spell\b/, "Conjuro de musa"],
            [/\bMuse Feat\b/, "Dote de musa"],
            [/\bMuse\b/, "Musa"],
            [/\bMuses\b/, "Musas"],
            [/\bPolymath\b/, "Polifacético"],
            [/\bGreater Performer's Heart\b/, "Corazón del intérprete mayor"],
            [/\bPerformer's Heart\b/, "Corazón del intérprete"],
            [/\bMagnum Opus\b/, "Obra maestra"],
            [/\bSpell List\b/, "Lista de conjuros"],
            [/You use this magical tradition and spell list;/, "Utilizas esta tradición mágica y esta lista de conjuros;"],
            [/\bPatron Skill\b/, "Habilidad de patrón"],
            [/You become trained in the skill associated with your patron’s magical tradition./, "Obtienes el rango entrenado en la habilidad asociada con la tradición mágica de tu patrón."],
            [/\bInitial Lesson\b/, "Lección inicial"],
            [/This is the first lesson your patron teaches you and is unique to your patron./, "Ésta es la primera lección que tu patrón te enseña y es única de éste."],
            [/\bFamiliar Ability\b/, "Aptitud de familiar"],
            [/One of your familiar’s two bonus abilities is always the one listed here, a mark of your patron’s indelible influence. The benefit can occur only once per round when you Cast or Sustain a hex, and you can choose whether it occurs before or after the effects of Casting or Sustaining the hex./, "Una de las 2 aptitudes adicionales de tu familiar siempre es la indicada aquí, una marca de la indeleble influencia de tu patrón. El beneficio puede tener lugar tan sólo una vez por asalto cuando Lanzas o Mantienes un maleficio, y puedes elegir si ocurre antes o después de los efectos de Lanzarlo o Mantenerlo."],
            [/\bPatron's Puppet\b/, "Marioneta del patrón"],
            [/\bPatron's Gift\b/, "Don del patrón"],
            [/\bPatron\b/, "Patrón"],
            [/\bFaith's Flamekeeper\b/, "Guardián de la llama de la fe"],
            [/\bLesson of Fervor's Grasp\b/, "Lección del agarre de la fe"],
            [/\bFamiliar of Restored Spirit\b/, "Familiar del espíritu restablecido"],
            [/\bThe Inscribed One\b/, "El inscrito"],
            [/\bLesson of Glyph's Supremacy\b/, "Lección de la supremacía del glifo"],
            [/\bFamiliar of Flowing Script\b/, "Familiar de escritura fluida"],
            [/\bThe Resentment\b/, "El resentimiento"],
            [/\bLesson of Strength's Impermanence\b/, "Lección de la transitoriedad de la fuerza"],
            [/\bFamiliar of Ongoing Misery\b/, "Familiar de tristeza continuada"],
            [/\bSilence in Snow\b/, "Silencio en la nieve"],
            [/\bLesson of Winter's Chill\b/, "Lección del frío del invierno"],
            [/\bFamiliar of Freezing Rime\b/, "Familiar de escarcha congeladora"],
            [/\bSpinner of Threads\b/, "Tejedor de hebras"],
            [/\bLesson of Fate's Vicissitudes\b/, "Lección de las vicisitudes del destino"],
            [/\bFamiliar of Balanced Luck\b/, "Familiar de suerte equilibrada"],
            [/\bStarless Shadow\b/, "Sombra sin estrellas"],
            [/\bLesson of Night's Terrors\b/, "Lección de los terrores de la noche"],
            [/\bFamiliar of Stalking Night\b/, "Familiar de la noche acechante"],
            [/\bWilding Steward\b/, "Senescal de lo salvaje"],
            [/\bLesson of Wild Speech\b/, "Lección del habla salvaje"],
            [/\bFamiliar of Keen Senses\b/, "Familiar de sentidos agudos"],
            [/\bWitch Spellcasting\b/, "Lanzamiento de conjuros de brujo"],
            [/\bHex Spells\b/, "Maleficios"],
            [/\bInitial Hex\b/, "Maleficio inicial"],
            [/\bMagical Fortitude\b/, "Fortaleza mágica"],
            [/\bWill of the Pupil\b/, "Voluntad del pupilo"],
            [/\bCleric Spellcasting\b/, "Lanzamiento de conjuros de clérigo"],
            [/\bDomain Initiate\b/, "Iniciado de un dominio"],
            [/You can select this feat multiple times, selecting a different domain each time and gaining its domain spell./, "Puedes seleccionar esta dote en múltiples ocasiones, con un dominio diferente cada vez, obteniendo así su conjuro de dominio."],
            [/\bDomain\b/, "Dominio"],
            [/\bSanctification\b/, "Santificación"],
            [/\bUnholy\b/, "Sacrílego"],
            [/\bHoly\b/, "Sagrado"],
            [/\bNeither\b/, "Ninguna"],
            [/\bEdicts\b/, "Edictos"],
            [/\bAnathema\b/, "Anatemas"],
            [/\bDivine Font\b/, "Fuente divina"],
            [/\bCleric Font\b/, "Fuente de clérigo"],
            [/\bHealing Font\b/, "Fuente curativa"],
            [/\bHarmful Font\b/, "Fuente dañina"],
            [/\bFont\b/, "Fuente"],
            [/\bFirst Doctrine\b/, "Primera doctrina"],
            [/\bSecond Doctrine\b/, "Segunda doctrina"],
            [/\bThird Doctrine\b/, "Tercera doctrina"],
            [/\bFourth Doctrine\b/, "Cuarta doctrina"],
            [/\bFifth Doctrine\b/, "Quinta doctrina"],
            [/\bFinal Doctrine\b/, "Doctrina final"],
            [/\bDoctrine\b/, "Doctrina"],
            [/\bCloistered Cleric\b/, "Clérigo de clausura"],
            [/\bWarpriest\b/, "Sacerdote de guerra"],
            [/\bDeity's Favored Weapon\b/, "arma predilecta de dios"],
            [/\bDeity Skill\b/, "Habilidad de dios"],
            [/\bDeity\b/, "Dios"],
            [/\bResolute Faith\b/, "Fe resoluta"],
            [/\bDivine Defense\b/, "Defensa divina"],
            [/\bMiraculous Spell\b/, "Conjuro milagroso"],
            [/\bDruid Spellcasting\b/, "Lanzamiento de conjuros de druida"],
            [/When you get spell slots of 2nd rank and higher, you can fill those slots with stronger versions of lower-rank spells\. This increases the spell's rank, heightening it to match the spell slot\. Many spells have specific improvements when they are heightened to certain ranks\./, "Cuando obtienes espacios de conjuro de 2.º rango y superior, puedes rellenarlos con versiones más potentes de conjuros de rango más bajo. Esto incrementa el rango del conjuro, potenciándolo para que encaje con el espacio de conjuro. Muchos conjuros obtienen mejoras específicas cuando se potencian a ciertos rangos."],
            [/Some of your spells are cantrips\. A cantrip is a special type of spell that doesn't use spell slots\. You can cast a cantrip at will, any number of times per day\. A cantrip is always automatically heightened to half your level rounded up— this is usually equal to the highest rank of druid spell slot you have\. For example, as a 1st-level druid, your cantrips are 1st-rank spells, and a 5th-level druid's are 3rd rank\./, "Algunos de tus conjuros se denominan trucos. Un truco es un tipo especial de conjuro que no utiliza espacios de conjuro. Puedes lanzar un truco a voluntad, todas las veces que quieras al día. Un truco se potencia siempre automáticamente a la mitad de tu nivel redondeado hacia arriba; esto suele ser igual al rango mayor de espacio de conjuro de druida que tienes. Por ejemplo, como druida de 1.er nivel, tus trucos son conjuros de 1.er rango, y los de un druida de 5.º nivel son conjuros de 3.º."],
            [/\bVoice of Nature\b/, "Voz de la Naturaleza"],
            [/\bDruidic Order\b/, "Orden druídica"],
            [/\bAnimal Order\b/, "Orden animal"],
            [/\banimal order\b/, "orden animal"],
            [/Commit wanton cruelty to animals or kill animals unnecessarily\. \(This doesn’t prevent you from defending yourself against animals or killing them cleanly for food\)\./, "Cometer crueldades sin sentido contra los animales o matarlos innecesariamente (esto no evita que te puedas defender de ellos o que los sacrifiques limpiamente para obtener comida)."],
            [/\bLeaf Order\b/, "Orden de la hoja"],
            [/\bleaf order\b/, "orden de la hoja"],
            [/Commit wanton cruelty to plants or fungi or kill them unnecessarily\. \(This doesn’t prevent you from defending yourself or harvesting them for survival\.\)/, "Cometer crueldades sin sentido contra las plantas u hongos o matarlos innecesariamente (esto no impide que te puedas defender de ellos o que los coseches para sobrevivir)."],
            [/\bStorm Order\b/, "Orden de la tormenta"],
            [/\bstorm order\b/, "orden de la tormenta"],
            [/Pollute the air, allow those who cause major air pollution or climate shifts to go unpunished\. \(This doesn’t force you to take action against merely potential environmental harm or to sacrifice yourself against an obviously superior foe\.\)/, "Contaminar el aire, permitir que quienes causan una fuerte contaminación del aire o cambios climáticos se vayan de rositas (esto no te obliga a actuar contra un daño al medio ambiente meramente potencial ni a sacrificarte contra un enemigo obviamente superior)."],
            [/\bUntamed Order\b/, "Orden indómita"],
            [/\buntamed order\b/, "orden indómita"],
            [/Become fully domesticated by the temptations of civilization\. \(This doesn’t prevent you from buying and using processed goods or staying in a city for an adventure, but you can never come to rely on these conveniences or truly call such a place your permanent home\./, "Verte completamente domesticado por las tentaciones de la civilización (esto no te impide comprar o utilizar comida procesada ni permanecer en una ciudad durante una aventura, pero nunca puedes llegarte a basar en dichas conveniencias ni fijar tu residencia permanente en uno de esos lugares)."],
            [/\bOrder Skill\b/, "Habilidad de orden"],
            [/\bDruid Feat\b/, "Dote de druida"],
            [/\bOrder Spell\b/, "Conjuro de orden"],
            [/\bOrder\b/, "Orden"],
            [/despoil natural places, consume more natural resources than you require to live comfortably, teach the Wildsong to non-druids./, "saquear lugares naturales, consumir más recursos naturales de los requeridos para vivir cómodamente, enseñar la canción salvaje a quienes no son druidas."],
            [/\bWildsong\b/, "Canción salvaje"],
            [/\bWild Willpower\b/, "Resolución salvaje"],
            [/\bPrimal Hierophant\b/, "Hierofante primigenio"],
            [/\bHunt Prey\b/, "Perseguir presa"],
            [/\bHunter's Edge\b/, "Ventaja del cazador"],
            [/\bNature's Edge\b/, "Ventaja de la Naturaleza"],
            [/\bEdge\b/, "Ventaja"],
            [/\bPrecision\b/, "Precisión"],
            [/\bFlurry\b/, "Ráfaga"],
            [/\bOutwit\b/, "Ser más listo"],
            [/\bTrackless Journey\b/, "Viaje sin rastros"],
            [/\bGreater Natural Reflexes\b/, "Reflejos naturales mayor"],
            [/\bNatural Reflexes\b/, "Reflejos naturales"],
            [/\bRanger Expertise\b/, "Experiencia de explorador"],
            [/\bWarden's Endurance\b/, "Aguante del guardián"],
            [/\bUnimpeded Journey\b/, "Viaje sin trabas"],
            [/\bMasterful Hunter Upgrade\b/, "Cazador maestro"],
            [/\bMasterful Hunter\b/, "Cazador maestro"],
            [/You can blend your weapon mastery with skillful targeting to make a series of precise attacks\. If you have master proficiency with your weapon, your multiple attack penalty for attacks against your hunted prey is –2 \(–1 with an agile weapon\) on your second attack of the turn, and –4 \(–2 with an agile weapon\) on your third and subsequent attacks of the turn\./, "Puedes mezclar tu maestría con las armas y una puntería hábil para llevar a cabo una serie de ataques precisos. Si tienes competencia a rango maestro con tu arma, tu penalizador por ataque múltiple para los ataques contra tu presa perseguida es -2 (-1 con un arma ágil) en tu segundo ataque del turno, y -4 (-2 con un arma ágil) en tu tercer ataque del turno y ataques siguientes."],
            [/Your mastery of skills allows you to overwhelm your prey\. If you have master proficiency in Deception, Intimidation, Stealth, or the skill you use to Recall Knowledge about your prey, increase the circumstance bonus against the prey with that skill from \+2 to \+4\. If you have master proficiency with your armor, increase the circumstance bonus to AC against the prey from \+1 to \+2\./, "Tu dominio de las habilidades te permite abrumar a tu presa. Si tienes competencia a rango maestro en Engaño, Intimidación, Sigilo o la habilidad que utilizas para Recordar conocimiento acerca de tu presa, incrementa de +2 a +4 el bonificador por circunstancia contra la misma con dicha habilidad. Si tienes competencia a rango maestro con tu armadura, incrementa de +1 a +2 el bonificador por circunstancia a la CA contra dicha presa."],
            [/Your weapon mastery allows you to hit your prey’s vital areas multiple times\. The second time in a round you hit your hunted prey, you also deal 1d8 precision damage\. At 19th level, your second hit in a round against your hunted prey deals 2d8 precision damage, and your third hit in a round against your hunted prey deals 1d8 precision damage\./, "Tu maestría con un arma te permite acertar en múltiples ocasiones en los puntos vitales de tu presa. La segunda vez en un asalto en la que aciertas a tu presa perseguida, le infliges además 1d8 daño de precisión. A 19.º nivel, tu segundo impacto en un asalto contra tu presa perseguida inflige 2d8 daño de precisión y el tercer impacto en un asalto contra tu presa perseguida inflige 1d8 daño de precisión."],
            [/\bSwift Prey\b/, "Presa rápida"],
            [/\bClass Skill\b/, "Habilidad de clase"],
            [/\bReactive Strike\b/, "Golpe reactivo"],
            [/A creature within your reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it’s using./, "Una criatura a tu alcance utiliza una acción de manipular o de movimiento, lleva a cabo un ataque a distancia o abandona una casilla durante una acción de movimiento que está utilizando."],
            [/\bBravery\b/, "Valentía"],
            [/\bFighter Weapon Mastery\b/, "Maestría en armas de guerrero"],
            [/\bWeapon Mastery Group\b/, "Grupo de maestría en armas"],
            [/\bBattlefield Surveyor\b/, "Topógrafo del campo de batalla"],
            [/\bBattle Hardened\b/, "Endurecido en combate"],
            [/\bCombat Flexibility\b/, "Flexibilidad de combate"],
            [/\bFighter Expertise\b/, "Experiencia de guerrero"],
            [/\bWeapon Legend Group\b/, "Grupo de leyenda en armas"],
            [/\bWeapon Legend\b/, "Leyenda en armas"],
            [/\bImproved Flexibility\b/, "Flexibilidad mejorada"],
            [/\bTempered Reflexes\b/, "Reflejos templados"],
            [/\bVersatile Legend\b/, "Leyenda versátil"],
            [/\bWizard Spellcasting\b/, "Lanzamiento de conjuros de mago"],
            [/\bSpellbook\b/, "Libro de conjuros"],
            [/\bArcane Thesis\b/, "Tesis arcana"],
            [/\bThesis\b/, "Tesis"],
            [/\bSpell Blending\b/, "Mezcla de conjuros"],
            [/\bExperimental Spellshaping\b/, "Moldeo de conjuros experimental"],
            [/\bStaff Nexus\b/, "Nexo de bastón"],
            [/\bImproved Familiar Attunement\b/, "Sintonización de familiar mejorada"],
            [/\bSpell Substitution\b/, "Sustitución de conjuros"],
            [/\bArcane School\b/, "Escuela arcana"],
            [/\bCurriculum Spell\b/, "Conjuro de currículo"],
            [/\bCurriculum Spells\b/, "Conjuros de currículo"],
            [/You automatically add some of the spells listed in your school’s curriculum to your spellbook\. At 1st level, you add a cantrip and two 1st-rank spells of your choice\. As soon as you gain the ability to cast wizard spells of a new rank, choose one of the spells from your curriculum of that rank to add to your spellbook\. A superscript “U” indicates an uncommon spell\. Your GM might allow you to swap or add other spells to your curriculum if they strongly fit the theme\./, "Añades automáticamente a tu libro de conjuros algunos de los conjuros indicados en el currículo de tu escuela. A 1.er nivel, añades un truco y dos conjuros de 1.er rango a tu elección. En cuanto obtienes la aptitud de lanzar conjuros de mago de un rango nuevo, eliges uno de los conjuros de tu currículo de dicho rango para añadir a tu libro. Un \"(PC)\" indica un conjuro poco común. Tu DJ te podría permitir que intercambiaras o añadieras otros conjuros a tu currículo si encajaran fuertemente en el tema."],
            [/Each day, you can prepare an extra cantrip from your curriculum\. You also gain an extra spell slot at each spell rank for which you have wizard spell slots\. You can prepare only spells from your school’s curriculum in these extra slots\. Any spell listed in your curriculum of a suitable spell rank is eligible to be prepared in each of these extra slots, regardless of how you added the spell to your spellbook\./, "Cada día, puedes preparar un truco adicional de tu currículo. También obtienes un espacio de conjuro adicional en cada rango de conjuros para el que dispones de espacios de conjuro de mago. En estos espacios adicionales tan solo puedes preparar conjuros del currículo de tu escuela. Todo conjuro indicado en tu currículo de un rango adecuado es elegible para ser preparado en cualquiera de estos espacios adicionales, da igual la forma en la que ha sido añadido a tu libro de conjuros."],
            [/School spells are a type of focus spell\. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point\. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity to study your spellbook or conduct arcane research\. Focus spells are automatically heightened to half your level rounded up, much like cantrips\. Focus spells don’t require spell slots, and you can’t cast them using spell slots\. Certain feats give you more focus spells\. The maximum Focus Points your focus pool can hold is equal to the number of focus spells you have, but it can never be more than 3 points\. You learn the initial school spell, which is unique to your school\. You can learn the advanced school spell with the Advanced School Spell feat\./, "Los conjuros de escuela son un tipo de conjuro de foco. Cuesta 1 Punto de Foco lanzar un conjuro de foco y empiezas con una reserva de 1 Punto de Foco. Repones tu reserva de foco durante tus preparativos diarios y puedes recuperar 1 Punto de Foco invirtiendo 10 minutos en utilizar la actividad Reenfocar para estudiar tu libro de conjuros o llevar a cabo investigaciones arcanas. Los conjuros de foco se potencian automáticamente a la mitad de tu nivel redondeado hacia arriba, de forma muy parecida a los trucos. Los conjuros de foco no requieren espacios de conjuro, y no se pueden lanzar utilizando espacios de conjuro. Ciertas dotes te conceden más conjuros de foco. La cantidad máxima de Puntos de Foco que puede albergar tu reserva es igual al número de conjuros de foco que tienes, pero nunca puede ser superior a 3 puntos. Aprendes el conjuro de escuela inicial, que es único para la misma. Puedes aprender el conjuro de escuela avanzado mediante la dote Conjuro de escuela avanzado."],
            [/\bNo Curriculum\b/, "Sin currículo"],
            [/\bCurriculum\b/, "Currículo"],
            [/\bInitial School Spell\b/, "Conjuro de escuela inicial"],
            [/\bSchool Spells\b/, "Conjuros de escuela"],
            [/\bSchool of Ars Grammatica\b/, "Escuela del Arte Gramática"],
            [/cantrips: message, sigil; 1st: command, disguise magic, runic body, runic weapon; 2nd: dispel magic, translate; 3rd: enthrall, veil of privacy \(U\); 4th: dispelling globe \(U\), suggestion; 5th: sending, truespeech \(U\); 6th: repulsion, spellwrack; 7th: contingency, planar seal \(U\); 8th: quandary, unrelenting observation; 9th: detonate magic \(U\)/, "trucos: mensaje, sello; 1.º: orden, disfrazar magia, cuerpo rúnico, arma rúnica; 2.º: disipar magia, traducir; 3.º: cautivar, velo de privacidad (PC); 4.º: globo disipador (PC), sugerencia; 5.º: recado, habla verdadera (PC); 6.º: rechazo, arruinaconjuros; 7.º: contingencia, sello planario (PC); 8.º: dilema, observación implacable; 9.º: detonar magia (PC)"],
            [/initial: protective wards; advanced: rune of observation/, "inicial: custodias protectoras; avanzado: runa de observación"],
            [/\bSchool of Battle Magic\b/, "Escuela de Magia de Batalla"],
            [/cantrips: shield, telekinetic projectile; 1st: breathe fire, force barrage, mystic armor; 2nd: mist, resist energy; 3rd: earthbind, fireball; 4th: wall of fire, weapon storm; 5th: howling blizzard, impaling spike; 6th: chain lightning, disintegrate; 7th: energy aegis, true target; 8th: arctic rift, desiccate; 9th: falling stars/, "trucos: escudo, proyectil telequinético; 1.º: respirar fuego, descarga de fuerza, armadura mística; 2.º: niebla, resistir energía; 3.º: ligadura terrestre, bola de fuego; 4.º: muro de fuego, tormenta de armas; 5.º: ventisca aullante, púa empaladora; 6.º: cadena de relámpagos, desintegrar; 7.º: égida de energía, objetivo verdadero; 8.º: grieta ártica, desecar; 9.º: caída de estrellas"],
            [/initial: force bolt; advanced: energy absorption/, "inicial: rayo de fuerza; avanzado: absorción de energía"],
            [/\bSchool of the Boundary\b/, "Escuela del Límite"],
            [/cantrips: telekinetic hand, void warp; 1st: grim tendrils, phantasmal minion, summon undead; 2nd: darkness, see the unseen; 3rd: bind undead, ghostly weapon; 4th: flicker, translocate; 5th: banishment, invoke spirits; 6th: teleport \(U\), vampiric exsanguination; 7th: eclipse burst, interplanar teleport \(U\); 8th: quandary, unrelenting observation; 9th: massacre/, "trucos: mano telequinética, distorsión del vacío; 1.º: zarcillos macabros, esbirro fantasmal, convocar muertos vivientes; 2.º: oscuridad, ver lo invisible; 3.º: vincular muertos vivientes, arma fantasmal; 4.º: parpadeo, cambiar de sitio; 5.º: destierro, invocar espíritus; 6.º: teletransporte (PC), desangramiento vampírico; 7.º: explosión de eclipse, teletransporte interplanario (PC); 8.º: dilema, observación implacable; 9.º: masacre"],
            [/initial: fortify summoning; advanced: spiral of horrors/, "inicial: fortificar convocación; avanzado espiral de horrores"],
            [/\bSchool of Civic Wizardry\b/, "Escuela de Magia Cívica"],
            [/cantrips: prestidigitation, read aura; 1st: hydraulic push, pummeling rubble, summon construct; 2nd: revealing light, water walk; 3rd: cozy cabin, safe passage; 4th: creation, unfettered movement; 5th: control water, wall of stone; 6th: disintegrate, wall of force; 7th: planar palace, retrocognition; 8th: earthquake, pinpoint \(U\); 9th: foresight/, "trucos: prestidigitación, leer el aura; 1.º: empujón hidráulico, escombros apaleadores, convocar constructo; 2.º: luz reveladora, caminar sobre las aguas; 3.º: cabaña acogedora, pasaje seguro; 4.º: creación, movimiento sin restricciones; 5.º: controlar las aguas, muro de piedra; 6.º: desintegrar, muro de fuerza; 7.º: palacio planario, retrocognición; 8.º: terremoto, ubicar (PC); 9.º: premonición"],
            [/initial: earthworks; advanced: community restoration/, "inicial: movimiento de tierras; avanzado: restablecimiento comunitario"],
            [/\bSchool of Mentalism\b/, "Escuela del Mentalismo"],
            [/cantrips: daze, figment; 1st: dizzying colors, sleep, sure strike; 2nd: illusory creature, stupefy; 3rd: dream message, mind reading \(U\); 4th: nightmare, vision of death; 5th: hallucination, illusory scene; 6th: never mind, phantasmal calamity; 7th: project image, warp mind; 8th: disappearance, uncontrollable dance; 9th: phantasmagoria/, "trucos: atontar, fantasía; 1.º: colores mareantes, dormir, golpe seguro; 2.º: criatura ilusoria, anonadar; 3.º: mensaje onírico, leer la mente (PC); 4.º: pesadilla, visión de la muerte; 5.º: alucinación, escena ilusoria; 6.º: no importa, calamidad fantasmal; 7.º: proyectar imagen, distorsionar la mente; 8.º: desaparición, danza incontrolable; 9.º: fantasmagoría"],
            [/initial: charming push; advanced: invisibility cloak/, "inicial: empujón encantador; avanzado: capa de invisibilidad"],
            [/\bSchool of Protean Form\b/, "Escuela de la Forma Proteica"],
            [/cantrips: gouging claw, tangle vine; 1st: jump, pest form, spider sting; 2nd: enlarge, humanoid form; 3rd: feet to fins, vampiric feast; 4th: mountain resilience, vapor form; 5th: elemental form, toxic cloud; 6th: cursed metamorphosis, petrify; 7th: duplicate foe, fiery body; 8th: desiccate, monstrosity form; 9th: metamorphosis/, "trucos: garra punzante, zarcillo enmarañador; 1.º: saltar, forma de peste, aguijón de araña; 2.º: agrandar, forma humanoide; 3.º: pies a aletas, festín vampírico; 4.º: resiliencia de la montaña, forma de vapor; 5.º: forma elemental, nube tóxica; 6.º: metamorfosis maldita, petrificar; 7.º: duplicar enemigo, cuerpo flamígero; 8.º: desecar, forma de monstruosidad; 9.º: metamorfosis"],
            [/initial: scramble body; advanced: shifting form/, "inicial: revolver el cuerpo; avanzado: forma cambiante"],
            [/\bSchool of Unified Magical Theory\b/, "Escuela de la Teoría Mágica Unificada"],
            [/You don’t have a set curriculum, and so you don’t have curriculum spells and can’t benefit from abilities that specifically affect them\. Instead, you gain an additional 1st-level wizard class feat, and you add one 1st rank spell of your choice to your spellbook to represent your diverse studies\. Your studies into the very nature of magic itself have let you use it more efficiently—instead of using Drain Bonded Item only once per day, you can use it once per day for each rank of spell you can cast, recalling a spell of that rank each time\./, "No tienes un currículo fijo y, por lo tanto, ni tienes conjuros de currículo, ni te puedes beneficiar de las aptitudes que los afectan específicamente. En su lugar, obtienes una dote de clase de mago adicional de 1.er nivel, y sumas un conjuro de 1.er rango de tu elección a tu libro de conjuros para representar tus estudios diversos. Tus estudios sobre la propia naturaleza de la magia te permiten emplearla de forma más eficiente: en lugar de utilizar Drenar objeto vinculado sólo una vez al día, puedes utilizarlo una vez al día por cada rango de conjuros que eres capaz de lanzar, recordando un conjuro de dicho rango cada vez."],
            [/initial: hand of the apprentice; advanced: interdisciplinary incantation/, "inicial: mano del aprendiz; avanzado: encantamiento interdisciplinario"],
            [/\bArcane Bond\b/, "Vínculo arcano"],
            [/\bDrain Bonded Item\b/, "Drenar objeto vinculado"],
            [/Your bonded item is on your person\./, "Tu objeto vinculado está en tu persona"],
            [/\bProdigious Will\b/, "Voluntad prodigiosa"],
            [/\bArchwizard's Spellcraft\b/, "Conocimiento de conjuros de archimago"],
            [/\bRogue's Racket\b/, "Enredos de pícaro"],
            [/\bScoundrel Racket\b/, "Enredo de granuja"],
            [/\bThief Racket\b/, "Enredo de ladrón"],
            [/\bMastermind Racket\b/, "Enredo de mente maestra"],
            [/\bRuffian Racket\b/, "Enredo de rufián"],
            [/\bRacket\b/, "Enredo"],
            [/\bSneak Attack\b/, "Ataque furtivo"],
            [/\bSurprise Attack\b/, "Ataque por sorpresa"],
            [/\bDeny Advantage\b/, "Negar ventaja"],
            [/\bWeapon Tricks\b/, "Trucos con las armas"],
            [/\bEvasive Reflexes\b/, "Reflejos evasivos"],
            [/\bDebilitating Strike\b/, "Golpe debilitante"],
            [/\bDouble Debilitation\b/, "Debilitación doble"],
            [/\bDebilitation\b/, "Debilitación"],
            [/Your Strike hits an off-guard creature and deals damage./, "Tu Golpe impacta en una criatura desprevenida e inflige daño"],
            [/The target takes a –10-foot status penalty to its Speeds./, "El objetivo sufre un penalizador -10 pies (3 m) por estatus a sus Velocidades."],
            [/The target becomes enfeebled 1./, "El objetivo queda debilitado 1."],
            [/\bRogue Resilience\b/, "Resiliencia de pícaro"],
            [/\bRogue Expertise\b/, "Experiencia de pícaro"],
            [/\bGreater Rogue Reflexes\b/, "Reflejos de pícaro mejorados"],
            [/\bMaster Tricks\b/, "Trucos maestros"],
            [/\bAgile Mind\b/, "Mente ágil"],
            [/\bMaster Strike\b/, "Golpe maestro"],
            [/Your Strike hits an off-guard creature and deals damage\./, "Tu Golpe impacta en una criatura desprevenida e inflige daño."],
            [/The target is unaffected\./, "El objetivo no resulta afectado."],
            [/The target is enfeebled 2 until the end of your next turn\./, "El objetivo queda debilitado 2 hasta el final de tu siguiente turno."],
            [/The target is paralyzed for 4 rounds\./, "El objetivo queda paralizado durante 4 asaltos."],
            [/The target is paralyzed for 4 rounds, knocked unconscious for 2 hours, or killed \(your choice\)\./, "El objetivo queda paralizado durante 4 asaltos, inconsciente durante 2 horas o muere (a elegir por ti)."],
            [/\bMaster Rogue\b/, "Maestría de pícaro"],

            // class feats
            [/\bClass Feat\b/, "Dote de clase"],
            [/\bBardic Lore\b/, "Saber bárdico"],
            [/\bAnimal Empathy\b/, "Empatía animal"],
            [/\bPlant Empathy\b/, "Empatía vegetal"],
            [/\bAnimal Companion\b/, "Compañero animal"],
            [/\bLeshy Familiar\b/, "Familiar leshy"],
            [/\bStorm Born\b/, "Nacido de la tormenta"],
            [/\bUntamed Form\b/, "Forma indómita"],
            [/You can transform into shapes listed in animal form./, "Te puedes transformar en las formas indicadas en forma animal."],

            // skill feats
            [/\bSkill Feat\b/, "Dote de habilidad"],

            // general feats
            [/\bGeneral Feat\b/, "Dote general"],
            [/\bShield Block\b/, "Bloqueo con el escudo"],
            [/While you have your shield raised, you would take physical damage \(bludgeoning, piercing, or slashing\) from an attack\./, "Podrías sufrir daño debido a un ataque físico (contundente, perforante o cortante) cuando tienes el escudo alzado."],

            // focus spells
            [/\bPhase Familiar\b/, "Familiar en fase"],
            [/\bProtective Wards\b/, "Custodias protectoras"],
            [/\b5-foot burst or more\b/, "explosión de 5 pies (1,5 m) o más"],
            [/\b5-foot emanation centered on you\b/, "Emanación de 5 pies (1,5 m) centrada en ti"],
            [/\bsustained up to\b/, "mantenido hasta"],
            [/\bheal animal\b/, "curar animal"],
            [/\bHeal Animal\b/, "Curar animal"],
            [/\bsee text\b/, "ver texto"],
            [/\bwilling living animal\b/, "animal vivo voluntario"],
            [/The amount of healing increases by 1d8, and the additional healing for the 2-action version increases by 8\./, "La cantidad de curación se incrementa en 1d8 y la curación adicional por la versión de dos acciones se incrementa en 8"],
            [/The cornucopia produces an additional piece of food\. A creature can consume any amount of food from the same casting with a single Interact action\. Eating six pieces of produce from the cornucopia gives as much nourishment as one square meal for a typical human\./, "La cornucopia produce una pieza adicional de comida. Una criatura puede consumir cualquier cantidad de comida del mismo lanzamiento con una sola acción de Interactuar. Comerse 6 piezas de producto de la cornucopia proporciona el mismo alimento que una comida completa para un humano típico."],
            [/\btempest surge\b/, "oleada de tempestad"],
            [/\bTempest Surge\b/, "Oleada de tempestad"],
            [/The initial damage increases by 1d12./, "El daño inicial se incrementa en 1d12."],
            [/\buntamed shift\b/, "cambio indómito"],
            [/\bUntamed Shift\b/, "Cambio indómito"],
            [/You can choose up to two effects from the list\. Untamed claws leave terrible, ragged wounds that also deal 2d6 persistent bleed damage on a hit, and untamed jaws are envenomed, also dealing 2d6 persistent poison damage on a hit/, "Puedes elegir hasta 2 efectos de la lista. Garras indómitas dejan heridas terribles e irregulares, que infligen también 2d6 daño persistente por sangrado con un impacto y fauces indómitas están envenenadas, infligiendo también 2d6 daño persistente por veneno con un impacto."],
            [/You can choose up to three effects from the list\. Untamed claws deal 4d6 persistent bleed damage on a hit, and untamed jaws deal 4d6 persistent poison damage on a hit\./, "Puedes elegir hasta 3 efectos de la lista. Garras indómitas infligen 4d6 daño persistente por sangrado con un impacto y fauces indómitas infligen 4d6 daño persistente por veneno con un impacto."],
            [/\bRune of Observation\b/, "Runa de observación"],
            [/\bForce Bolt\b/, "Rayo de fuerza"],
            [/The damage increases by 1d4\+1/, "El daño se incrementa en 1d4+1"],
            [/\bEnergy Absorption\b/, "Absorción de energía"],
            [/The resistance increases by 5/, "La resistencia se incrementa en 5"],
            [/An effect would deal acid, cold, electricity, or fire damage to you/, "Un efecto te infligiría daño por ácido, electricidad, frío o fuego"],
            [/\bEarthworks\b/, "Movimiento de tierras"],
            [/You pull the barriers to float in the air, causing the spell to function as difficult terrain for flying creatures./, "Haces que los terraplenes floten en el aire, con lo que el conjuro funciona como terreno difícil para las criaturas voladoras"],
            [/\bCommunity Restoration\b/, "Restablecimiento comunitario"],
            [/You Cast a Spell from a wizard spell slot, and the spell affects one or more willing allies without damaging them/, "Lanzas un conjuro desde un espacio de conjuro de mago, que afecta a uno o más aliados voluntarios sin dañarlos"],
            [/\bCharming Push\b/, "Empujón encantador"],
            [/The target takes a –1 circumstance penalty to attack rolls and damage rolls against you/, "El objetivo sufre un penalizador -1 por circunstancia a las tiradas de ataque y de daño contra ti"],
            [/The target can't use hostile actions against you/, "El objetivo no puede utilizar acciones hostiles contra ti"],
            [/The target is stunned 1 and can't use hostile actions against you/, "El objetivo queda aturdido 1 y no puede utilizar acciones hostiles contra ti"],
            [/\bInvisibility Cloak\b/, "Capa de invisibilidad"],
            [/The duration increases to 10 minutes/, "La duración se incrementa a 10 minutos"],
            [/The duration increases to 1 hour/, "La duración se incrementa a 1 hora"],
            [/\bScramble Body\b/, "Revolver el cuerpo"],
            [/The target becomes sickened 1/, "El objetivo queda indispuesto 1"],
            [/The target becomes sickened 2 and slowed 1 as long as it's sickened/, "El objetivo queda indispuesto 2 y lentificado 1 mientras permanece indispuesto"],
            [/\bShifting Form\b/, "Forma cambiante"],
            [/\bHand of the Apprentice\b/, "Mano del aprendiz"],
            [/\bInterdisciplinary Incantation\b/, "Encantamiento interdisciplinario"],
            [/A creature within 30 feet casts an arcane spell/, "Una criatura a 30 pies (9 m) o menos lanza un conjuro arcano"],
            [/\bFortify Summoning\b/, "Fortificar convocación"],
            [/creature you summoned/, "criatura convocada por ti"],
            [/\bSpiral of Horrors\b/, "Espiral de horrores"],
            [/30-foot emanation/, "emanación de 30 pies (9 m)"],

            // spells
            [/\barcane\b/, "arcana"],
            [/\bdivine\b/, "divina"],
            [/\boccult\b/, "ocultista"],
            [/\bprimal\b/, "primigenia"],
            [/\bnightmare\b/, "pesadilla"],
            [/\bspellwrack\b/, "arruinaconjuros"],
            [/\bearthbind\b/, "ligadura terrestre"],
            [/\bwater walk\b/, "caminar sobre las aguas"],
            [/\bhumanoid form\b/, "forma humanoide"],
            [/\bmariner's curse\b/, "maldición del marinero"],
            [/\bcharm\b/, "hechizar"],
            [/\boutcast's curse\b/, "maldición del paria"],
            [/\bhoneyed words\b/, "palabras almibaradas"],
            [/\bHeightened\b/, "Potenciado"],
            [/\bSpell Slots\b/, "Espacios de conjuro"],
            [/\bSpell Rank\b/, "Rango de conjuro"],

            // weapons
            [/\bAlchemical Bomb\b/, "Bomba alquímica"],
            [/\bArbalest\b/, "Arbalesta"],
            [/\bArrows\b/, "Flechas"],
            [/\bBastard Sword\b/, "Espada bastarda"],
            [/\bBattle Axe\b/, "Hacha de batalla"],
            [/\bBlowgun\b/, "Cerbatana"],
            [/\bBo Staff\b/, "Bastón bo"],
            [/\bBola\b/, "Boleadoras"],
            [/\bBolts\b/, "Virotes"],
            [/\bClan Dagger\b/, "Daga de clan"],
            [/\bComposite Longbow\b/, "Arco largo compuesto"],
            [/\bComposite Shortbow\b/, "Arco corto compuesto"],
            [/\bOrc Knuckle Dagger\b/, "Daga orca de nudillos"],
            [/\bDagger\b/, "Daga"],
            [/\bDogslicer\b/, "Rajaperros"],
            [/\bDwarven War Axe\b/, "Hacha de guerra enana"],
            [/\bElven Curve Blade\b/, "Espada curva elfa"],
            [/\bFalchion\b/, "Alfanje"],
            [/\bFilcher's Fork\b/, "Tenedor de afanar"],
            [/\bFist\b/, "Puño"],
            [/\bSpiked Gauntlet\b/, "Guantelete armado"],
            [/\bGauntlet\b/, "Guantelete"],
            [/\bGlaive\b/, "Guja"],
            [/\bGnome Flickmace\b/, "Maza de giro gnoma"],
            [/\bGnome Hooked Hammer\b/, "Martillo ganchudo gnomo"],
            [/\bGreataxe\b/, "Gran hacha"],
            [/\bGreatclub\b/, "Gran clava"],
            [/\bGreatpick\b/, "Gran pico"],
            [/\bGreatsword\b/, "Mandoble"],
            [/\bGuisarme\b/, "Bisarma"],
            [/\bHalberd\b/, "Alabarda"],
            [/\bHalfling Sling Staff\b/, "Bastón honda mediano"],
            [/\bHand Crossbow\b/, "Ballesta de mano"],
            [/\bHatchet\b/, "Hacha de mano"],
            [/\bHeavy Crossbow\b/, "Ballesta pesada"],
            [/\bHorsechopper\b/, "Sajacaballos"],
            [/\bJavelin\b/, "Jabalina"],
            [/\bLance\b/, "Lanza de caballería"],
            [/\bLight Hammer\b/, "Martillo ligero"],
            [/\bLight Mace\b/, "Maza ligera"],
            [/\bLight Pick\b/, "Pico ligero"],
            [/\bLongbow\b/, "Arco largo"],
            [/\bLongspear\b/, "Lanza larga"],
            [/\bLongsword\b/, "Espada larga"],
            [/\bMace\b/, "Maza"],
            [/\bMain-gauche\b/, "Daga de guardamano"],
            [/\bMaul\b/, "Mazo"],
            [/\bMorningstar\b/, "Maza de armas"],
            [/\bOrc Necksplitter\b/, "Partecuellos orco"],
            [/\bRanseur\b/, "Ronca"],
            [/\bRapier\b/, "Espada ropera"],
            [/\bSap\b/, "Cachiporra"],
            [/\bSawtooth Saber\b/, "Sable aserrado"],
            [/\bScimitar\b/, "Cimitarra"],
            [/\bScythe\b/, "Guadaña"],
            [/\bSeedpod\b/, "Tegumento"],
            [/\bShield Bash\b/, "Golpe con el escudo"],
            [/\bShield Boss\b/, "Umbo de escudo"],
            [/\bShield Spikes\b/, "Púas de escudo"],
            [/\bShortbow\b/, "Arco corto"],
            [/\bShortsword\b/, "Espada corta"],
            [/\bSickle\b/, "Hoz"],
            [/\bSling Bullets\b/, "Balas de honda"],
            [/\bSpiked Chain\b/, "Cadena armada"],
            [/\bStaff\b/, "Bastón"],
            [/\bStarknife\b/, "Cuchillo de estrella"],
            [/\bTemple Sword\b/, "Espada del templo"],
            [/\bTrident\b/, "Tridente"],
            [/\bWar Flail\b/, "Mangual de guerra"],
            [/\bWarhammer\b/, "Martillo de guerra"],
            [/\bWhip\b/, "Látigo"],

            [/\bExplorer's Clothing\b/, "Ropa de explorador"],
            [/\bChain Shirt\b/, "Camisote de malla"],
            [/\bStudded Leather\b/, "Cuero tachonado"],
            [/\bLeather\b/, "Cuero"],
            [/\bPadded Armor\b/, "Ropa acolchada"],
            [/\bBreastplate\b/, "Coraza"],
            [/\bScale Mail\b/, "Cota de escamas"],
            [/\bChain Mail\b/, "Cota de malla"],
            [/\bHide\b/, "Pieles"],
            [/\bFull Plate\b/, "Armadura completa"],
            [/\bSplint Mail\b/, "Armadura laminada"],
            [/\bHalf Plate\b/, "Placas y mallas"],

            [/\bCloth\b/, "Ropa"],
            [/\bPlate\b/, "Placas"],
            [/\bComposite\b/, "Compuesto"],

            [/\bSteel Shield\b/, "Escudo de acero"],
            [/\bWooden Shield\b/, "Escudo de madera"],
            [/\bTower Shield\b/, "Escudo pavés"],
            [/\bBuckler\b/, "Rodela"],

            [/\bBackpack\b/, "Mochila"],
            [/\bCaltrops\b/, "Abrojos"],
            [/\bOil\b/, "Aceite (1 pinta [0,5l])"],
            [/\bSaddlebags\b/, "Alforjas"],
            [/\bTorch\b/, "Antorcha"],
            [/\bTack\b/, "Arreos"],
            [/\bMerchant's Scale\b/, "Balanza de mercader"],
            [/\bCompass \(Lensatic\)/, "Brújula (lente y dial)"],
            [/\bCompass\b/, "Brújula"],
            [/\bChain\b/, "Cadena (10 pies [3m])"],
            [/\bDueling Cape\b/, "Capa de duelo"],
            [/\bSpyglass \(Fine\)/, "Catalejo (gran calidad)"],
            [/\bSpyglass\b/, "Catalejo"],
            [/\bLock \(Poor\)/, "Cerradura barata"],
            [/\bLock \(Simple\)/, "Cerradura sencilla"],
            [/\bLock \(Average\)/, "Cerradura normal"],
            [/\bLock \(Good\)/, "Cerradura buena"],
            [/\bLock \(Superior\)/, "Cerradura superior"],
            [/\bChest\b/, "Cofre"],
            [/\bRope\b/, "Cuerda (50 pies [15m])"],
            [/\bAdventurer's Pack\b/, "Equipo de aventurero"],
            [/\bRepair Kit \(Superb\)/, "Equipo de reparaciones soberbio"],
            [/\bRepair Kit\b/, "Equipo de reparaciones"],
            [/\bLadder\b/, "Escala (10 pies [3m])"],
            [/\bMirror\b/, "Espejo"],
            [/\bGrappling Hook\b/, "Garfio de abordaje"],
            [/\bManacles \(Poor\)/, "Grilletes baratos"],
            [/\bManacles \(Simple\)/, "Grilletes sencillos"],
            [/\bManacles \(Average\)/, "Grilletes normales"],
            [/\bManacles \(Good\)/, "Grilletes buenos"],
            [/\bManacles \(Superior\)/, "Grilletes superiores"],
            [/\bTool \(Long\)/, "Herramienta larga"],
            [/\bTool \(Short\)/, "Herramienta corta"],
            [/\bMusical Instrument \(Heavy\)/, "Instrumento musical pesado"],
            [/\bMusical Instrument \(Handheld\)/, "Instrumento musical de mano"],
            [/\bMusical Instrument \(Virtuoso Heavy\)/, "Instrumento musical pesado de virtuoso"],
            [/\bMusical Instrument \(Virtuoso Handheld\)/, "Instrumento musical de mano de virtuoso"],
            [/\bSoap\b/, "Jabón"],
            [/\bMug\b/, "Jarra"],
            [/\bAlchemist's Toolkit\b/, "Juego de herramientas de alquimista"],
            [/\bArtisan's Toolkit \(Sterling\)/, "Juego de herramientas de artesano excelentes"],
            [/\bArtisan's Toolkit\b/, "Juego de herramientas de artesano"],
            [/\bThieves' Toolkit \(Infiltrator Picks\)/, "Ganzúas de infiltrador"],
            [/\bThieves' Toolkit \(Replacement Picks\)/, "Ganzúas de repuesto"],
            [/\bThieves' Toolkit \(Infiltrator\)/, "Juego de herramientas de ladrón infiltrador"],
            [/\bThieves' Toolkit\b/, "Juego de herramientas de ladrón"],
            [/\bAlchemist's Lab \(Expanded\)/, "Laboratorio de alquimista mejorado"],
            [/\bAlchemist's Lab\b/, "Laboratorio de alquimista"],
            [/\bBasic Crafter's Book\b/, "Libro básico de artesano"],
            [/\bSpellbook \(Blank\)/, "Libro de conjuros (en blanco)"],
            [/\bFormula Book \(Blank\)/, "Libro de fórmulas (en blanco)"],
            [/\bLantern \(Bull's-Eye\)/, "Linterna de ojo de buey"],
            [/\bLantern \(Hooded\)/, "Linterna sorda"],
            [/\bMagnifying Glass\b/, "Lupa"],
            [/\bCookware\b/, "Material de cocina"],
            [/\bHealer's Toolkit \(Expanded\)/, "Material de curas mejorado"],
            [/\bHealer's Toolkit\b/, "Material de curas"],
            [/\bDetective's Kit\b/, "Material de detective"],
            [/\bDisguise Kit \(Replacement Cosmetics\)/, "Cosméticos de repuesto"],
            [/\bDisguise Kit \(Elite\)/, "Material de disfraz de élite"],
            [/\bDisguise Kit \(Elite Cosmetics\)/, "Cosméticos de élite"],
            [/\bDisguise Kit\b/, "Material de disfraz"],
            [/\bClimbing Kit \(Extreme\)/, "Material de escalada extrema"],
            [/\bClimbing Kit\b/, "Material de escalada"],
            [/\bWriting Set \(Extra Ink and Paper\)/, "Papel y tinta de repuesto"],
            [/\bWriting Set\b/, "Material de escritura"],
            [/\bFishing Tackle \(Professional\)/, "Material de pesca profesiona"],
            [/\bFishing Tackle\b/, "Material de pesca"],
            [/\bWaterskin\b/, "Odre"],
            [/\bBrass Ear\b/, "Oreja de bronce"],
            [/\bCrowbar \(Levered\)/, "Palanqueta reforzada"],
            [/\bCrowbar\b/, "Palanqueta"],
            [/\bFlint and Steel\b/, "Pedernal y yesca"],
            [/\bPeriscope\b/, "Periscopio"],
            [/\bTen-Foot Pole\b/, "Pértiga de 10 pies (3m)"],
            [/\bPiton\b/, "Pitón"],
            [/\bRations\b/, "Raciones"],
            [/\bNet\b/, "Red"],
            [/\bHourglass\b/, "Reloj de arena"],
            [/\bClothing \(Ordinary\)/, "Ropa normal"],
            [/\bClothing \(Explorer's\)/, "Ropa de explorador"],
            [/\bClothing \(Fine\)/, "Ropa de calidad"],
            [/\bClothing \(High-Fashion Fine\)/, "Ropa de calidad y diseño"],
            [/\bClothing \(Cold-weather\)/, "Ropa de invierno"],
            [/\bSack\b/, "Saco"],
            [/\bBedroll\b/, "Saco de dormir"],
            [/\bSignal Whistle\b/, "Silbato de señales"],
            [/\bPrimal Symbol\b/, "Símbolo primigenio"],
            [/\bReligious Symbol \(Wooden\)/, "Símbolo religioso de madera"],
            [/\bReligious Symbol \(Silver\)/, "Símbolo religioso de plata"],
            [/\bReligious Text\b/, "Texto religioso"],
            [/\bTent \(Pup\)/, "Tienda de campaña ratonera"],
            [/\bTent \(Four-Person\)/, "Tienda de campaña para cuatro personas"],
            [/\bTent \(Pavilion\)/, "Tienda de campaña pabellón"],
            [/\bChalk\b/, "Tiza "],
            [/\bParrying Scabbard\b/, "Vaina de parada"],
            [/\bConcealed Sheath\b/, "Vaina oculta"],
            [/\bCandle\b/, "Vela"],
            [/\bScholarly Journal \(Compendium\)/, "Compendio de diarios de erudito"],
            [/\bScholarly Journal\b/, "Diario de erudito"],
            [/\bSurvey Map \(Atlas\)/, "Atlas topográfico"],
            [/\bSurvey Map\b/, "Mapa topográfico"],

            [/\bRest\b/, "Descansar"],
            [/\bAdd Condition\b/, "Añadir estado"],
            [/\bAdd Custom Buff\b/, "Añadir mejora personalizada"],
            [/\bHero Points\b/, "Puntos de Héroe"],

            [/\bPerception\b/, "Percepción"],
            [/\bInitiative\b/, "Iniciativa"],

            [/\bCritical Success\b/, "Éxito crítico"],
            [/\bSuccess\b/, "Éxito"],
            [/\bCritical Failure\b/, "Fallo crítico"],
            [/\bFailure\b/, "Fallo"],

            [/\bRecovery Checks\b/, "Pruebas de recuperación"],
            [/\bTaking Damage\b/i, "Sufrir daño"],

            [/\bBlinded\b/, "Cegado"],
            [/\bClumsy\b/, "Torpe"],
            [/\bConcealed\b/, "Oculto"],
            [/\bConfused\b/, "Confundido"],
            [/\bControlled\b/, "Controlado"],
            [/\bDazzled\b/, "Deslumbrado"],
            [/\bDeafened\b/, "Ensordecido"],
            [/\bDoomed\b/, "Condenado"],
            [/\bDrained\b/, "Drenado"],
            [/\bDying\b/, "Moribundo"],
            [/\bEncumbered\b/, "Impedido"],
            [/\bEnfeebled\b/, "Debilitado"],
            [/\bFascinated\b/, "Fascinado"],
            [/\bFatigued\b/, "Fatigado"],
            [/\bFleeing\b/, "Huyendo"],
            [/\bFrightened\b/, "Asustado"],
            [/\bGrabbed\b/, "Agarrado"],
            [/\bHidden\b/, "Escondido"],
            [/\bImmobilized\b/, "Inmovilizado"],
            [/\bObserved\b/, "Observado"],
            [/\bOff-guard\b/, "Desprevenido"],
            [/\bParalyzed\b/, "Paralizado"],
            [/\bPersistent Damage\b/, "Daño persistente"],
            [/\bPetrified\b/, "Petrificado"],
            [/\bProne\b/, "Tumbado"],
            [/\bQuickened\b/, "Acelerado"],
            [/\bRestrained\b/, "Neutralizado"],
            [/\bSickened\b/, "Indispuesto"],
            [/\bSlowed\b/, "Lentificado"],
            [/\bStunned\b/, "Aturdido"],
            [/\bStupefied\b/, "Anonadado"],
            [/\bUnconscious\b/, "Inconsciente"],
            [/\bUndetected\b/, "No detectado"],
            [/\bUnnoticed\b/, "Inadvertido"],
            [/\bWounded\b/, "Herido"],

            [/\bBard\b/, "Bardo"],
            [/\bCleric\b/, "Clérigo"],
            [/\bDruid\b/, "Druida"],
            [/\bFighter\b/, "Guerrero"],
            [/\bRanger\b/, "Explorador"],
            [/\bRogue\b/, "Pícaro"],
            [/\bWitch\b/, "Brujo"],
            [/\bWizard\b/, "Mago"],

            [/\bAlchemist\b/, "Alquimista"],
            [/\bBarbarian\b/, "Bárbaro"],
            [/\bChampion\b/, "Campeón"],
            [/\bInvestigator\b/, "Investigador"],
            [/\bMonk\b/, "Monje"],
            [/\bOracle\b/, "Oráculo"],
            [/\bSorcerer\b/, "Hechicero"],
            [/\bSwashbuckler\b/, "Espadachín"],

            [/\bAncient Elf\b/, "Elfo antiguo"],
            [/\bArctic Elf\b/, "Elfo ártico"],
            [/\bCavern Elf\b/, "Elfo de las cavernas"],
            [/\bWhisper Elf\b/, "Elfo de los susurros"],
            [/\bWoodland Elf\b/, "Elfo silvano"],
            [/\bSeer Elf\b/, "Elfo vidente"],
            [/\bForge Dwarf\b/, "Enano de la forja"],
            [/\bRock Dwarf\b/, "Enano de la roca"],
            [/\bAncient-Blooded\b/, "Enano de sangre antigua"],
            [/You attempt a saving throw against a magical effect, but you haven’t rolled yet/, "Haces una tirada de salvación contra un efecto mágico pero aún no has tirado los dados"],
            [/Your ancestors’ innate resistance to magic surges before slowly ebbing down\. You gain a \+1 circumstance bonus to saving throws on the triggering save and other saves against magical effects until the end of this turn\./, "La resistencia innata a la magia de tus antepasados surge en ti antes de refluir. Obtienes un bonificador +1 por circunstancia a las tiradas de salvación desencadenante y a otras salvaciones contra efectos mágicos hasta el final de este turno."],
            [/\bStrong-Blooded Dwarf\b/, "Enano de sangre fuerte"],
            [/\bDeath Warden Dwarf\b/, "Enano guardián de la muerte"],
            [/\bChameleon Gnome\b/, "Gnomo camaleón"],
            [/\bWellspring Gnome\b/, "Gnomo manantial"],
            [/\bSensate Gnome\b/, "Gnomo sensible"],
            [/\bUmbral Gnome\b/, "Gnomo sombrío"],
            [/\bFey-Touched Gnome\b/, "Gnomo tocado por las hadas"],
            [/\bSnow Goblin\b/, "Goblin de la nieve"],
            [/\bRazortooth Goblin\b/, "Goblin dientes afilados"],
            [/\bUnbreakable Goblin\b/, "Goblin irrompible"],
            [/\bCharhide Goblin\b/, "Goblin piel ignífuga"],
            [/\bIrongut Goblin\b/, "Goblin tripas de hierro"],
            [/\bSkilled Human\b/, "Humano hábil"],
            [/\bVersatile Human\b/, "Humano versátil"],
            [/\bGourd Leshy\b/, "Leshy calabaza"],
            [/\bSeaweed Leshy\b/, "Leshy de las algas"],
            [/\bFruit Leshy\b/, "Leshy de las frutas"],
            [/\bLeaf Leshy\b/, "Leshy de las hojas"],
            [/\bRoot Leshy\b/, "Leshy de las raíces"],
            [/\bVine Leshy\b/, "Leshy de las vides"],
            [/\bCactus Leshy\b/, "Leshy de los cactus"],
            [/\bFungus Leshy\b/, "Leshy de los hongos"],
            [/\bLotus Leshy\b/, "Leshy de los lotos"],
            [/\bGutsy Halfling\b/, "Mediano con agallas"],
            [/\bHillock Halfling\b/, "Mediano de las colinas"],
            [/\bWildwood Halfling\b/, "Mediano de las florestas salvajes"],
            [/\bTwilight Halfling\b/, "Mediano del crepúsculo"],
            [/\bJinxed Halfling\b/, "Mediano gafador"],
            [/You can curse another creature with clumsiness\. This curse has a range of 30 feet, and you must be able to see your target\. The target gets a Will saving throw to resist this jinx, using your class DC or spell DC, whichever is higher\./, "Puedes maldecir a otra criatura con la torpeza. Esta maldición tiene un rango de distancia de 30 pies (9 m) y debes ser capaz de ver a tu objetivo, que obtiene una salvación de Voluntad contra tu CD de clase o contra tu CD de conjuro, la mayor de ambas."],
            [/The target is unaffected and is temporarily immune for 24 hours\./, "El objetivo no se ve afectado y queda inmune durante 24 horas."],
            [/The target is clumsy 1 for 1 minute\./, "El objetivo queda torpe 1 durante 1 minuto."],
            [/The target is clumsy 2 for 1 minute\./, "El objetivo queda torpe 2 durante 1 minuto."],
            [/\bNomadic Halfling\b/, "Mediano nómada"],
            [/\bRainfall Orc\b/, "Orco de la lluvia"],
            [/\bDeep Orc\b/, "Orco de las profundidades"],
            [/\bGrave Orc\b/, "Orco de las sepulturas"],
            [/\bBadlands Orc\b/, "Orco de las tierras baldías"],
            [/\bWinter Orc\b/, "Orco del invierno"],
            [/\bBattle Ready\b/, "Orco listo para la batalla"],
            [/\bHold-Scarred Orc\b/, "Orco marcado por el clan"],
            [/\bNephilim\b/, "Nefilim"],
            [/\bCustom Mixed Heritage\b/, "Herencia mixta personalizada"],
            [/\bHeritage\b/, "Herencia"],

            [/\bAncestry Boosts\b/, "Mejoras de ascendencia"],
            [/\bAll Ancestries\b/, "Todas ascendencias"],
            [/\bAncestry\b/, "Ascendencia"],
            [/\bHumanoid\b/, "Humanoide"],
            [/\bDwarf\b/, "Enano"],
            [/\bDwarves\b/, "Enanos"],
            [/\bDwarven\b/, "Enano"],
            [/\bElf\b/, "Elfo"],
            [/\bElves\b/, "Elfos"],
            [/\bElven\b/, "Elfo"],
            [/\bHalfling\b/, "Mediano"],
            [/\bHalflings\b/, "Medianos"],
            [/\bGnome\b/, "Gnomo"],
            [/\bGnomes\b/, "Gnomos"],
            [/\bHalfling\b/, "Mediano"],
            [/\bHuman\b/, "Humano"],
            [/\bOrc\b/, "Orco"],
            [/\bOrcs\b/, "Orcos"],

            [/\bCatfolk\b/, "Felino"],
            [/\bLizardfolk\b/, "Lagarto"],
            [/\bRatfolk\b/, "Rata"],

            [/\bBackground Boosts\b/, "Mejoras de bagaje"],
            [/\bBackground\b/, "Bagaje"],
            [/\bAcolyte\b/, "Acólito"],
            [/\bAcrobat\b/, "Acróbata"],
            [/\bFortune Teller\b/, "Adivino"],
            [/\bEntertainer\b/, "Animador"],
            [/\bArtisan\b/, "Artesano"],
            [/\bArtist\b/, "Artista"],
            [/\bBandit\b/, "Bandido"],
            [/\bBarkeep\b/, "Barman"],
            [/\bScout\b/, "Batidor"],
            [/\bLaborer\b/, "Bracero"],
            [/\bBounty Hunter\b/, "Cazarrecompensas"],
            [/\bHunter\b/, "Cazador"],
            [/\bBarrister\b/, "Letrado"],
            [/\bCharlatan\b/, "Charlatán"],
            [/\bCook\b/, "Cocinero"],
            [/\bWarrior\b/, "Combatiente"],
            [/\bRaised by Belief\b/, "Criado por la fe"],
            [/\bCriminal\b/, "Delincuente"],
            [/\bMartial Disciple\b/, "Discípulo marcial"],
            [/\bEmissary\b/, "Emisario"],
            [/\bHermit\b/, "Ermitaño"],
            [/\bScholar\b/, "Erudito"],
            [/\bGladiator\b/, "Gladiador"],
            [/\bStreet Urchin\b/, "Golfillo"],
            [/\bGuard\b/, "Guardia"],
            [/\bHerbalist\b/, "Herbolario"],
            [/\bGambler\b/, "Jugador"],
            [/\bFarmhand\b/, "Labrador"],
            [/\bBarrister\b/, "Letrado"],
            [/\bTeacher\b/, "Maestro"],
            [/\bTinker\b/, "Manitas"],
            [/\bSailor\b/, "Marino"],
            [/\bField Medic\b/, "Médico de campaña"],
            [/\bMerchant\b/, "Mercader"],
            [/\bMiner\b/, "Minero"],
            [/\bNomad\b/, "Nómada"],
            [/\bPrisoner\b/, "Preso"],
            [/\bCultist\b/, "Sectario"],
            [/\bAnimal Whisperer\b/, "Susurrador de animales"],

            [/\bKEY ABILITY\b/, "ATRIBUTO CLAVE"],
            [/\bPERCEPTION\b/, "PERCEPCIÓN"],
            [/\bSAVING THROWS\b/, "TIRADAS DE SALVACIÓN"],
            [/\bSKILLS\b/, "HABILIDADES"],
            [/\bATTACKS\b/, "ATAQUES"],
            [/\bDEFENSES\b/, "DEFENSAS"],
            [/\bCLASS DC\b/, "CD DE CLASE"],
            [/\bSPELLS\b/, "CONJUROS"],

            [/\bABILITY BOOSTS AND FLAWS\b/, "MEJORAS Y DEFECTOS DE ATRIBUTO"],
            [/\bSet Abilities\b/, "Poner atributos"],
            [/\bSet Starting Ability Boosts\b/, "Poner mejoras de atributo iniciales"],
            [/\bTwo free Ability Boosts\b/, "Dos mejoras de atributo gratuitas"],
            [/\bAbility Boosts\b/, "Mejoras de atributo"],
            [/\bClass Boost\b/, "Mejora de clase"],
            [/\bFree Boosts\b/, "Mejoras gratuitas"],
            [/\bBoosts\b/, "Mejoras"],
            [/\bFlaw\b/, "Defecto"],
            [/\bSkill Increase\b/, "Incremento de habilidad"],
            [/\bSkill Training\b/, "Entrenamiento en habilidades"],

            [/\bLANGUAGES\b/, "IDIOMAS"],

            [/\bSPECIAL\b/, "ESPECIAL"],
            [/\bLow-Light Vision\b/, "Visión en la penumbra"],
            [/\blow-light vision\b/, "visión en la penumbra"],
            [/\bDarkvision\b/, "Visión en la oscuridad"],
            [/\bdarkvision\b/, "visión en la oscuridad"],
            [/\bKeen Eyes\b/, "Buen ojo"],
            [/\bPlant Nourishment\b/, "Nutrición de planta"],

            [/\bAcrobatics\b/, "Acrobacias"],
            [/\bArcana\b/, "Arcanos"],
            [/\bAthletics\b/, "Atletismo"],
            [/\bCrafting\b/, "Artesanía"],
            [/\bDeception\b/, "Engaño"],
            [/\bDiplomacy\b/, "Diplomacia"],
            [/\bIntimidation\b/, "Intimidación"],
            [/\bLore\b/, "Saber"],
            [/\bLores\b/, "Saberes"],
            [/\bMedicine\b/, "Medicina"],
            [/\bNature\b/, "Naturaleza"],
            [/\bOccultism\b/, "Ocultismo"],
            [/\bPerformance\b/, "Interpretación"],
            [/\bReligion\b/, "Religión"],
            [/\bSociety\b/, "Sociedad"],
            [/\bStealth\b/, "Sigilo"],
            [/\bSurvival\b/, "Supervivencia"],
            [/\bThievery\b/, "Latrocinio"],

            [/\bDemon\b/, "Demonio"],
            [/\bHag\b/, "Saga"],

            // common Lore categories
            [/\bAcademia\b/, "Académico"],
            [/\bAccounting\b/, "Contabilidad"],
            [/\bArchitecture\b/, "Arquitectura"],
            [/\bArt\b/, "Arte"],
            [/\bAstronomy\b/, "Astronomía"],
            [/\bBardic\b/, "Bárdico"],
            [/\bCarpentry\b/, "Carpintería"],
            [/\bCircus\b/, "Circo"],
            [/\bCooking\b/, "Cocinar"],
            [/\bDriving\b/, "Conducir"],
            [/\bEngineering\b/, "Ingeniería"],
            [/\bFarming\b/, "Agricultura"],
            [/\bFishing\b/, "Pesca"],
            [/\bFortune-Telling\b/, "Buenaventura"],
            [/\bGames\b/, "Juegos"],
            [/\bGenealogy\b/, "Genealogía"],
            [/\bGladiatorial\b/, "Gladiadores"],
            [/\bGuild\b/, "Gremio"],
            [/\bHeraldry\b/, "Heráldica"],
            [/\bHerbalism\b/, "Herboristería"],
            [/\bHunting\b/, "Caza"],
            [/\bLabor\b/, "Trabajo"],
            [/\bLibrary\b/, "Bibliotecas"],
            [/\bMercantile\b/, "Mercantil"],
            [/\bMidwifery\b/, "Partos"],
            [/\bMilling\b/, "Molienda"],
            [/\bMining\b/, "Minería"],
            [/\bPiloting\b/, "Pilotar"],
            [/\bSailing\b/, "Navegar"],
            [/\bScouting\b/, "Explorar"],
            [/\bScribing\b/, "Escritura"],
            [/\bStabling\b/, "Establos"],
            [/\bTanning\b/, "Curtiduría"],
            [/\bTea\b/, "Té"],
            [/\bTheater\b/, "Teatro"],
            [/\bUnderworld\b/, "Bajos fondos"],
            [/\bWarfare\b/, "Guerra"],

            // These are translated back to English through reverseReplaceRules such that the info modal can open
            [/\bTwo-Hand\b/, "A dos manos"],
            [/\bAgile\b/, "Ágil"],
            [/\bReach\b/, "Alcance"],
            [/\bThrown\b/, "Arrojadiza"],
            [/\bSweep\b/, "Barrido"],
            [/\bRanged Trip\b/, "Derribo a distancia"],
            [/\bTrip\b/, "Derribo"],
            [/\bDisarm\b/, "Desarme"],
            [/\bShove\b/, "Empujón"],
            [/\bAttached to Shield\b/, "Fijado al escudo"],
            [/\bTwin\b/, "Gemela"],
            [/\bJousting\b/, "De justa"],
            [/\bDeadly\b/, "Letal"],
            [/\bFree-Hand\b/, "Mano libre"],
            [/\bNonlethal\b/, "No letal"],
            [/\bGained from Leshy Tegumento feat only\b/, "Obtenido por el dote de leshy Tegumento"],
            [/\bConcealable\b/, "Ocultable"],
            [/\bParry\b/, "Parada"],
            [/\bPropulsive\b/, "De propulsión"],
            [/\bBackstabber\b/, "Puñalada trapera"],
            [/\bBackswing\b/, "Revés"],
            [/\bUnarmed Attacks\b/, "Ataques sin armas"],
            [/\bUnarmed\b/, "Sin armas"],
            [/\bFinesse\b/, "Sutil"],
            [/\bVersatile B\b/, "Versátil Con"],
            [/\bVersatile S\b/, "Versátil Cor"],
            [/\bVersatile P\b/, "Versátil Per"],
            [/\bForceful\b/, "Vigorosa"],
            [/\bVolley\b/, "Volea"],

            [/\bBulwark\b/, "Baluarte"],
            [/\bComfort\b/, "Cómoda"],
            [/\bNoisy\b/, "Ruidosa"],

            [/\bconcentrate\b/, "concentrar"],
            [/\bConcentrate\b/, "Concentrar"],

            [/\bSHIELD\b/, "ESCUDO"],
            [/\bNo Shield\b/, "Sin escudo"],
            [/Armor Class/i, "Clase de armadura"],
            [/\bRaise\b/, "Alzar"],
            [/\bRaised\b/, "Alzado"],
            [/\bHardness\b/, "Dureza"],
            [/\bBroken\b/, "Roto"],
            [/\bBT\b/, "UR"],

            [/\bCircumstance Bonus\b/, "Bonificador por circunstancia"],
            [/\bItem Bonus\b/, "Bonificador por objeto"],
            [/\bStatus Bonus\b/, "Bonificador por estatus"],

            [/\bSimple Weapons\b/, "Armas sencillas"],
            [/\bMartial Weapons\b/, "Armas marciales"],
            [/\bAdvanced Weapons\b/, "Armas avanzadas"],
            [/\bFree Action\b/, "Acción gratuita"],
            [/\bReaction\b/, "Reacción"],
            [/\bReactions\b/, "Reacciones"],
            [/\bNo action\b/, "Sin acción"],
            [/\bAction\b/, "Acción"],
            [/\bActions\b/, "Acciones"],
            [/\bFree\b/, "Gratuita"],
            [/\bAdd Weapon\b/, "Añadir arma"],
            [/\bPrint\b/, "Imprimir"],
            [/\bCritical Specialization\b/, "Especialización crítica"],

            [/\bLight Armor\b/, "Armadura ligera"],
            [/\bMedium Armor\b/, "Armadura intermedia"],
            [/\bHeavy Armor\b/, "Armadura pesada"],
            [/\bUnarmored\b/, "Sin armadura"],
            [/\bItem\b/, "Objeto"],
            [/\bDex Cap\b/, "Tope Des."],
            [/\bAC Bonus\b/, "Bon. CA"],
            [/\bCheck Penalty\b/, "Pen. pruebas"],
            [/\bSpeed Penalty\b/, "Pen. Velocidad"],
            [/\bStow Additional Armor\b/, "Guardar armadura adicional"],
            [/\bStow Additional Shield\b/, "Guardar escudo adicional"],
            [/\bArmor Specialization\b/, "Especialización en armadura"],

            [/\bAdd Gear\b/, "Añadir equipo"],
            [/\bAdd Container\b/, "Añadir recipiente"],
            [/\bAdd Formula\b/, "Añadir fórmula"],
            [/\bAdd Effect\b/, "Añadir efecto"],
            [/\bMain Inventory\b/i, "Inventario principal"],
            [/\bFormulae\b/i, "Fórmulas"],

            [/\bAxe\b/, "Hacha"],
            [/\bBomb\b/, "Bomba"],
            [/\bBow\b/, "Arcos"],
            [/\bBrawling\b/, "Pelea"],
            [/\bClub\b/, "Clava"],
            [/\bCrossbow\b/, "Ballesta"],
            [/\bDart\b/, "Dardo"],
            [/\bFirearm\b/, "Arma de fuego"],
            [/\bFlail\b/, "Mangual"],
            [/\bHammer\b/, "Martillo"],
            [/\bKnife\b/, "Cuchillo"],
            [/\bPick\b/, "Pico"],
            [/\bPolearm\b/, "De asta"],
            [/\bShield\b/, "Escudo"],
            [/\bSling\b/, "Honda"],
            [/\bSpear\b/, "Lanza"],
            [/\bSword\b/, "Espada"],

            [/\bB, P or S\b/, "Con, Per o Cor"],
            [/(?<=\d\s)B\b/, "Con"],
            [/(?<=\d\s)P\b/, "Per"],
            [/(?<=\d\s)S\b/, "Cor"],
            [/\bPiercing\b/, "Perforante"],
            [/\bSlashing\b/, "Cortante"],
            [/\bBludgeoning\b/, "Contundente"],
            [/\bSpecials\b/, "Especiales"],
            [/\bSpecial\b/, "Especial"],

            [/\bProficiency\b/, "Competencia"],
            [/\bGroup\b/, "Grupo"],
            [/\bPrice\b/, "Precio"],
            [/\bTotal Bulk\b/i, "Impedimenta total"],
            [/\bBulk\b/, "Impedimenta"],
            [/\bEnc\b/i, "Impedido"],
            [/\bUnencumbered\b/i, "No estás impedido"],
            [/\bOver Max\b/i, "Sobre máximo"],
            [/\bMax\b/i, "Máx"],
            [/\bHands\b/, "Manos"],
            [/\bRange\b/, "Rango de distancia"],
            [/\btouch\b/, "toque"],
            [/\bDefense\b/, "Defensa"],
            [/\bbasic Fortitude\b/, "Fortaleza básica"],
            [/\bbasic Reflex\b/, "Reflejos básica"],
            [/\bbasic Will\b/, "Voluntad básica"],
            [/\bDuration\b/, "Duración"],
            [/\bvaries\b/, "variable"],
            [/\buntil the start of your next turn\b/, "hasta el inicio de tu siguiente turno"],
            [/\bminute\b/, "minuto"],
            [/\bminutes\b/, "minutos"],
            [/\bhour\b/, "hora"],
            [/\bhours\b/, "horas"],
            [/\bArea\b/, "Área"],
            [/\bTargets\b/, "Objetivos"],
            [/\bReload\b/, "Recarga"],
            [/\bAmount\b/, "Cantidad"],
            [/\bQty\b/, "Ctd"],
            [/\bRequirements\b/, "Requisitos"],
            [/\bPrerequisites\b/, "Prerrequisitos"],
            [/\bTrigger\b/, "Desencadenante"],
            [/\bEffect\b/, "Efecto"],
            [/\bFrequency\b/, "Frecuencia"],
            [/\bAttack\b/, "Ataque"],
            [/\bHeightening Spells\b/, "Potenciación de conjuros"],
            [/\bInitial Proficiencies\b/, "Competencias iniciales"],
            [/\bSpell Repertoire\b/, "Repertorio de conjuros"],
            [/\bSwapping Spells In Your Repertoire\b/, "Cómo intercambiar conjuros en tu repertorio"],
            [/\bLearning Spells\b/, "Aprendizaje de conjuros"],
            [/\bUndying\b/, "Inmortal"],
            [/\bFocus Spells\b/, "Conjuros de foco"],
            [/\bFocus Cantrips\b/, "Trucos de foco"],
            [/\bFocus Points\b/, "Puntos de foco"],
            [/\bCantrips\b/, "Trucos"],
            [/\bSpells\b/, "Conjuros"],

            [/\btwice per week\b/, "dos veces por semana"],
            [/\bonce per day\b/, "una vez al día"],
            [/\bonce per hour\b/, "una vez por hora"],
            [/\bonce every 10 minutes\b/, "una vez cada 10 minutos"],
            [/\bYou have\b/i, "Tienes"],

            [/\bCommon\b/, "Común"],
            [/\bUncommon\b/, "Poco común"],
            [/\bRare\b/, "Raro"],

            [/(?<=\d)\s?pp\b/, "ppt"],
            [/(?<=\d)\s?gp\b/, "po"],
            [/(?<=\d)\s?sp\b/, "pp"],
            [/(?<=\d)\s?cp\b/, "pc"],
            [/\bPlatinum\b/, "Platino"],
            [/\bGold\b/, "Oro"],
            [/\bSilver\b/, "Plata"],
            [/\bCopper\b/, "Cobre"],

            [/\bHP\b/, "PG"],
            [/\bTemporary Hit Points\b/, "Puntos de golpe temporales"],
            [/\bTemp Hit Points\b/, "Puntos de golpe temp."],
            [/\bHit Points\b/, "Puntos de golpe"],
            [/\bHIT POINTS\b/, "PUNTOS DE GOLPE"],

            [/\bBuy\b/, "Comprar"],
            [/\bGive\b/, "Darte"],
            [/\bCancel\b/, "Cancelar"],
            [/\bClose\b/, "Cerrar"],
            [/\bFinished\b/, "Listo"],
            [/\bCustom\b/, "Personalizar"],
            [/\bAccept\b/, "Aceptar"],
            [/\bSelect\b/, "Seleccionar"],
            [/\bCreate\b/, "Crear"],
            [/\bRoll\b/, "Tirar"],
            [/\bOptions\b/, "Opciones"],
            [/\bRunes\b/, "Runas"],
            [/\bStow\b/, "Guardar"],
            [/\bRemove\b/, "Quitar"],
            [/\bDelete\b/, "Borrar"],
            [/\bChange\b/, "Cambiar"],
            [/\bSwap\b/, "Intercambiar"],
            [/\bRestore\b/, "Restaurar"],
            [/\bHit\b/, "Acertar"],
            [/\bDamage\b/, "Daño"],
            [/\bHealed\b/, "Curado"],
            [/\bin inventory\b/, "en inventario"],
            [/\bin gp\b/, "en po"],

            [/\bClass\b/, "Clase"],
            [/\bLevel\b/, "Nivel"],
            [/XP/, "PX"],
            [/Character Name/, "Nombre del personaje"],

            [/\bSIZE\b/, "TAMAÑO"],
            [/\bSize\b/, "Tamaño"],
            [/\bTiny\b/, "Menudo"],
            [/\bSmall\b/, "Pequeño"],
            [/\bMedium\b/, "Mediano"],
            [/\bLarge\b/, "Grande"],
            [/\bHuge\b/, "Enorme"],
            [/\bGargantuan\b/, "Gargantuesco"],
            [/\bliving creature\b/, "criatura viva"],
            [/\bliving creatures\b/, "criaturas vivas"],
            [/\bcreature\b/, "criatura"],
            [/\bcreatures\b/, "criaturas"],

            [/\bSPEED\b/, "VELOCIDAD"],
            [/\bSpeed\b/, "Velocidad"],
            [/(?<=\d)\s?ft\./, " pies"],
            [/\bfeet\b/i, "pies"],
            [/\bfor(?=\s\d)/, "por"],

            [/\bDC\b/, "CD"],
            [/\bAC\b/, "CA"],
            [/\bFortitude\b/, "Fortaleza"],
            [/\bReflex\b/, "Reflejos"],
            [/\bWill\b/, "Voluntad"],

            [/\bSTR\b/, "FUE"],
            [/\bDEX\b/, "DES"],
            [/\bWIS\b/, "SAB"],
            [/\bCHA\b/, "CAR"],
            [/\bStr\b/, "Fue"],
            [/\bDex\b/, "Des"],
            [/\bWis\b/, "Sab"],
            [/\bCha\b/, "Car"],
            [/\bStrength\b/, "Fuerza"],
            [/\bDexterity\b/, "Destreza"],
            [/\bConstitution\b/, "Constitución"],
            [/\bIntelligence\b/, "Inteligencia"],
            [/\bWisdom\b/, "Sabiduría"],
            [/\bCharisma\b/, "Carisma"],
            [/\bProf\b/, "Comp"],

            // miscellaneous non-terms
            [/\bor\b/, "o"],
        ];

        // used for traits
        let reverseReplaceRules = [
            [/\bComún\b/, "Common"],
            [/\bPoco común\b/, "Uncommon"],
            [/\bRaro\b/, "Rare"],

            [/\bElfo\b/, "Elf"],
            [/\bEnano\b/, "Dwarf"],
            [/\bHumano\b/, "Human"],
            [/\bHumanoide\b/, "Humanoid"],
            [/\bGnomo\b/, "Gnome"],
            [/\bMediano\b/, "Halfling"],
            [/\bOrco\b/, "Orc"],
            [/\bNefilim\b/, "Nephilim"],

            [/\bBardo\b/, "Bard"],
            [/\bClérigo\b/, "Cleric"],
            [/\bDruida\b/, "Druid"],
            [/\bGuerrero\b/, "Fighter"],
            [/\bExplorador\b/, "Ranger"],
            [/\bPícaro\b/, "Rogue"],
            [/\bBrujo\b/, "Witch"],
            [/\bMago\b/, "Wizard"],

            [/\bAlquimista\b/, "Alchemist"],
            [/\bBárbaro\b/, "Barbarian"],
            [/\bCampeón\b/, "Champion"],
            [/\bInvestigador\b/, "Investigator"],
            [/\bMonje\b/, "Monk"],
            [/\bOráculo\b/, "Oracle"],
            [/\bHechicero\b/, "Sorcerer"],
            [/\bEspadachín\b/, "Swashbuckler"],

            [/\bA dos manos\b/, "Two-Hand"],
            [/Ágil\b/, "Agile"],
            [/\bAlcance\b/, "Reach"],
            [/\bArrojadiza\b/, "Thrown"],
            [/\bBarrido\b/, "Sweep"],
            [/\bBallesta\b/, "Crossbow"],
            [/\bDerribo a distancia\b/, "Ranged Trip"],
            [/\bDerribo\b/, "Trip"],
            [/\bDesarme\b/, "Disarm"],
            [/\bEmpujón\b/, "Shove"],
            [/\bFijado\b/, "Attached"],
            [/\bGemela\b/, "Twin"],
            [/\bDe justa\b/, "Jousting"],
            [/\bLetal\b/, "Deadly"],
            [/\bMano libre\b/, "Free-Hand"],
            [/\bNo letal\b/, "Nonlethal"],
            [/\bOcultable\b/, "Concealable"],
            [/\bParada\b/, "Parry"],
            [/\bDe propulsión\b/, "Propulsive"],
            [/\bPuñalada trapera\b/, "Backstabber"],
            [/\bRevés\b/, "Backswing"],
            [/\bSin armas\b/, "Unarmed"],
            [/\bSutil\b/, "Finesse"],
            [/\bVersátil\b/, "Versatile"],
            [/\bVigorosa\b/, "Forceful"],
            [/\bVolea\b/, "Volley"],

            [/\bBaluarte\b/, "Bulwark"],
            [/\bCómoda\b/, "Comfort"],
            [/\bRuidosa\b/, "Noisy"],
        ];

        // specialized rules for optimization and to handle multiple Spanish words for one English word
        let sectionMenuReplaceRules = [
            [/\bCommon\b/, "Común"],
            [/\bUncommon\b/, "Poco común"],
            [/\bRare\b/, "Raro"],
            [/\bAll Ancestries\b/, "Todas ascendencias"],
            [/\bAll Heritages\b/, "Todas herencias"],
            [/\bAll Classes\b/, "Todas clases"],
            [/\bAncestry Feats\b/, "Dotes de ascendencia"],

            [/\bGear\b/, "Equipo"],
            [/\bConsumables\b/, "Consumibles"],
            [/\bMagic Items\b/, "Objetos mágicos"],
            [/\bAdventuring\b/, "De aventura"],
            [/\bAmmunition\b/, "Munición"],
            [/\bWeapon Attachments\b/, "Accesorio de arma"],

            [/\bAll\b/, "Todas"],
            [/\bSimple\b/, "Sencillas"],
            [/\bMartial\b/, "Marciales"],
            [/\bAdvanced\b/, "Avanzadas"],
            [/\bUnarmed\b/, "Sin armas"],
            [/\bProficient\b/, "Competente"],
            [/\bStandard\b/, "Estándares"],
            [/\bMagic\b/, "Mágicas"],
            [/\bCustom\b/, "Personalizadas"],

            [/\bLight\b/, "Ligera"], // due to the spell
            [/\bMedium\b/, "Intermedia"], // due to the size category
            [/\bHeavy\b/, "Pesada"],
            [/\bUnarmored\b/, "Sin armadura"],

            [/\bFocus Spells\b/, "Conjuros de foco"],
            [/\bBard\b/, "Bardo"],
            [/\bWitch\b/, "Brujo"],
            [/\bCleric Font\b/, "Fuente de clérigo"],
            [/\bCleric\b/, "Clérigo"],
            [/\bDruid\b/, "Druida"],
            [/\bWizard\b/, "Mago"],
            [/\bRituals\b/, "Rituales"],

            [/\bCore\b/, "Núcleo"],
            [/\bExpanded\b/, "Expandido"],
            [/\bCampaign\b/, "Campaña"],

        ]

        // descriptions of feats, items, spells, conditions etc.
        let listviewDetailReplaceRules = [

            // ancestry feat descriptions
            [/Watching your friends age and die fills you with moroseness that protects you against harmful emotions\. You gain a \+1 circumstance bonus to saving throws against emotion effects\. If you roll a success on a saving throw against an emotion effect, you get a critical success instead\./, "Ver envejecer y morir a tus amigos te llena de una melancolía que te protege contra las emociones dañinas. Obtienes un bonificador +1 por circunstancia a las tiradas de salvación contra los efectos de emoción. Si obtienes un éxito en una tirada de salvación contra un efecto de emoción, en su lugar obtienes un éxito crítico."],
            [/Your muscles are tightly honed\. Your Speed increases by 5 feet\./, "Tus músculos están bien entrenados. Tu Velocidad se incrementa en 5 pies (1,5 m)."],
            [/You favor bows and other elegant weapons\. You gain access to all uncommon weapons with the elf trait\. You have familiarity with weapons with the elf trait plus longbows, composite longbows, rapiers, shortbows, and composite shortbows - for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\./, "Prefieres los arcos y otras armas elegantes. Obtienes acceso a todas las armas poco comunes con el rasgo elfo. Tienes familiaridad con las armas con el rasgo elfo además de los arcos largos, arcos largos compuestos, espadas roperas, arcos cortos y arcos cortos compuestos; a efectos de competencia, tratas cualquier arma marcial de éstas como una arma sencilla y cualquier arma avanzada de éstas como una arma marcial."],
            [/You have accumulated a vast array of lived knowledge over the years\. During your daily preparations, you can reflect upon your life experiences to gain the trained proficiency rank in one skill of your choice\. This proficiency lasts until you prepare again\. Since this proficiency is temporary, you can't use it as a prerequisite for a skill increase or a permanent character option like a feat\./, "Has acumulado un amplio abanico de conocimientos vividos a lo largo de los años. Durante tus preparativos diarios, puedes reflexionar sobre tus experiencias vitales para obtener competencia a rango entrenado en una habilidad a tu elección. Esta competencia dura hasta que la preparas de nuevo. Como quiera que es temporal, no puedes utilizarla como prerrequisito para un incremento de habilidad o para una opción de personaje permanente como una dote."],
            [/Your elven magic manifests as a simple arcane spell, even if you aren't formally trained in magic\. Choose one cantrip from the arcane spell list \(page 304\)\. You can cast this cantrip as an arcane innate spell at will\. A cantrip is heightened to a spell rank equal to half your level rounded up\./, "Tu magia élfica se manifiesta como un conjuro arcano sencillo, incluso si no estás entrenado formalmente en la magia. Elige un truco de la lista de conjuros arcanos. Puedes lanzar a voluntad este truco como un conjuro innato arcano. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba."],
            [/You've studied traditional elven arts, learning about arcane magic and the world around you\. You gain the trained proficiency rank in Arcana and Nature\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Additional Lore general feat for Elf Lore\./, "Has estudiado las artes élficas tradicionales, aprendiendo acerca de la magia arcana y del mundo que te rodea. Obtienes competencia a rango entrenado en Arcanos y en Naturaleza. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes la dote general Saber adicional en Saber (elfos)"],
            [/Your mystic control and meditations allow you to resist external influences upon your consciousness\. Whenever you are affected by a mental effect that lasts at least 2 rounds, you can reduce the duration by 1 round\. You still require natural sleep, but you treat your saving throws against effects that would cause you to fall asleep as one degree of success better\. This protects only against sleep effects, not against other forms of falling unconscious\./, "Tu control místico y tus meditaciones te permiten resistir las influencias externas sobre tu consciencia. Siempre que te ves afectado por un efecto mental que dura por lo menos 2 asaltos, puedes reducir en 1 asalto su duración. Sigues necesitando dormir de forma natural, pero tratas tus tiradas de salvación contra efectos que te harían quedar dormido como un grado de éxito mejor. Esto protege tan solo contra los efectos de sueño, no contra otras formas de quedar inconsciente."],
            [/You've crossed blades with a wide variety of foes wielding a wide variety of weapons, and you've learned the basics of fighting with nearly any of them\. When wielding a weapon you aren't proficient with, treat your level as your proficiency bonus\./, "Has cruzado aceros con una gran variedad de enemigos que empuñaban una amplia variedad de armas, y has aprendido lo básico de combatir con casi todas ellas. Cuando empuñas una arma en la que no tienes competencia, tratas tu nivel como tu bonificador por competencia."],
            [/At 11th level, you become trained in all weapons\./, "A 11.º nivel, obtienes el rango entrenado en todas las armas."],
            [/You work at a pace born from longevity that enhances your thoroughness\. You can voluntarily spend twice as much time as normal on a Perception check or skill check that takes 1 action or longer\. If you do, you gain a \+2 circumstance bonus to the check and don't automatically reduce your degree of success on a natural 1 \(you get a critical failure only if your result is 10 lower than the DC\)\. For example, you could get these benefits if you spent 2 actions to Seek, which normally takes 1 action\. You can get these benefits during exploration by taking twice as long exploring as normal, or in downtime by spending twice as much downtime\./, "Trabajas a un ritmo emanado de la longevidad, que potencia tu esmero. Puedes invertir voluntariamente el doble del tiempo habitual en una prueba de Percepción o de habilidad. Si lo haces, obtienes un bonificador +2 por circunstancia a la prueba y no reduces automáticamente tu grado de éxito si te sale un 1 natural (sólo se considera un fallo crítico una tirada cuyo resultado es 10 menos que la clase de dificultad). Por ejemplo, podrías obtener dichos beneficios invirtiendo 2 acciones para Buscar, que normalmente sólo requiere 1 acción. Puedes obtener dichos beneficios durante la exploración invirtiendo el doble de tiempo de lo habitual o, en el tiempo libre, invirtiendo el doble de tiempo libre."],
            [/The GM might determine a situation doesn't grant you a benefit if a delay would be directly counterproductive to your success, such as a tense negotiation with an impatient creature\./, "El DJ podría determinar que una situación no te concede beneficios si un retraso sería directamente contraproducente para tu propósito, como por ejemplo una negociación tensa con una criatura impaciente."],
            [/Long-lived elves have seen civilizations rise and fall, often at the hands of outside forces\. As a result, they have developed a wariness of others who might seek to influence or control them\. You've been trained to resist such manipulation, gaining a \+2 circumstance bonus to saving throws against effects that would make you controlled, such as dominate, and to Perception checks to Sense Motive when trying to determine if a creature is under the influence of such an effect\. When you roll a success on a saving throw against such an effect, you get a critical success instead\./, "Los elfos, que tienen una vida muy larga, han visto alzarse y caer civilizaciones, a menudo a manos de fuerzas externas. Como resultado, han desarrollado cautela hacia quienes podrían querer influenciarlos o controlarlos. Has sido entrenado para resistir dichas manipulaciones, obteniendo un bonificador +2 por circunstancia a las tiradas de salvación contra los efectos que te dejarían controlado, como por ejemplo dominar, y a las pruebas de Percepción para Averiguar intenciones cuando tratas de determinar si una criatura está bajo la influencia de uno de dichos efectos. Si obtienes un éxito en una tirada de salvación contra uno de dichos efectos, en su lugar obtienes un éxito crítico."],
            [/You've continued to refine the knowledge and skills you've gained through your life\. When you choose a skill in which to become trained with Ancestral Longevity, you can also choose a skill in which you are already trained and become an expert in that skill\. This lasts until your Ancestral Longevity expires\./, "Has continuado refinando el conocimiento y las habilidades obtenidas a lo largo de tu vida. Cuando eliges una habilidad en la que obtener el rango entrenado con Longevidad ancestral, puedes elegir una en la que ya dispones del rango entrenado, y obtener el rango experto en ella. Esto dura hasta que expira tu Longevidad ancestral."],
            [/When the effects of Ancestral Longevity and Expert Longevity expire, you can retrain one of your skill increases\. The skill increase you gain from this retraining must either make you trained in the skill you chose with Ancestral Longevity or make you an expert in the skill you chose with Expert Longevity\./, "Cuando los efectos de Longevidad ancestral y Longevidad experta expiran, puedes reconvertir uno de tus incrementos de habilidad. El incremento de habilidad que obtienes de esta reconversión tiene que hacer que obtengas, o bien el rango entrenado en la habilidad elegida con Longevidad ancestral, o bien el rango experto en la habilidad elegida con Longevidad experta."],
            [/You move in a graceful dance, and even your steps are broad\. You Step 5 feet twice\./, "Te mueves en una danza grácil, e incluso tus pasos son amplios. Puedes dar un Paso de 5 pies (1,5 m) dos veces."],
            [/The arcane magic you possess grows in power and complexity\. Choose one common 2nd-rank spell from the same tradition as an innate spell you previously gained from another elf ancestry feat \(from the arcane list if you have Otherworldly Magic, for example\)\. You can cast that spell as an innate spell once per day, using the same tradition as the list you chose the spell from\./, "La magia arcana de que dispones crece en poder y en complejidad. Elige un conjuro común de 2.º rango de la misma tradición que un conjuro innato previamente obtenido de otra dote de ascendencia de elfo (por ejemplo, de la lista arcana si tienes Magia de otro mundo). Puedes lanzar dicho conjuro como un conjuro innato una vez al día, utilizando la misma tradición que la lista de la que lo elegiste."],
            [/Your magic is adaptable\. By spending 1 day of downtime, you can change the spell you chose to a different common 2nd-rank spell from the same tradition\./, "Tu magia es adaptable. Invirtiendo 1 día de tiempo libre, puedes cambiar el conjuro elegido a un conjuro común diferente de 2.º rango de la misma tradición."],
            [/You've spent much of your life among the treetops and have become an expert at quickly and safely climbing them\. You gain a climb Speed of 10 feet\./, "Has pasado gran parte de tu vida en las copas de los árboles y te has vuelto un experto en trepar de forma rápida y segura. Obtienes una Velocidad de trepar de 10 pies (3 m)."],
            [/You've perfected your ability to keep up with all the skills you've learned over your long life, so you're almost never truly untrained at a skill\. You reflect on your life experiences, changing the skill you selected with Ancestral Longevity \(and the skill you selected with Expert Longevity if you have that feat\)\./, "Has perfeccionado tu capacidad para mantenerte al día en todas las habilidades que has aprendido durante tu larga vida, por lo que casi nunca estás enteramente sin entrenar en una habilidad. Reflexionas sobre tus experiencias vitales, cambiando la habilidad elegida con Longevidad ancestral (y la habilidad seleccionada con Longevidad experta si dispones de dicha dote)."],
            [/Though you know that you will eventually outlive your companions, seeing them at death's door brings clarity to your attacks\. Make a Strike\. Roll twice on the attack roll and use the higher result\./, "Aunque sabes que tarde o temprano vivirás más que tus compañeros, verles a las puertas de la muerte aporta claridad a tus ataques. Da un Golpe. Haz dos veces la tirada de ataque y utiliza el resultado más alto."],
            [/Your people used powerful magic to travel between distant worlds in the distant past, and the remnants of that magic make such transportation easier for you\. When you are the target of a teleportation spell that transports more than one person, it can affect an additional person beyond the normal limit, chosen by the caster\. Additionally, when you're the target of a teleport spell, you and the other targets arrive no farther than 1 mile off target, regardless of distance travelled\./, "Tu gente utilizaba magia poderosa para viajar entre mundos distantes en el lejano pasado, y los restos de dicha magia hacen que semejante transporte sea más fácil para ti. Cuando eres el objetivo de un conjuro de teletransporte que transporta más de una persona, puede afectar a una persona adicional más allá del límite normal, elegida por el lanzador. Además, cuando eres el objetivo de un conjuro de teletransporte, tú y los demás objetivos no llegáis a una distancia superior a 1 milla (1,6 km) del objetivo designado, sea cual sea la distancia recorrida."],
            [/Your innate connection to stone makes you adept at moving across uneven surfaces\. You can ignore difficult terrain caused by stone \(such as rubble or gravel\) and uneven ground made of stone and earth\. In addition, when you use the Acrobatics skill to Balance on narrow surfaces or uneven ground made of stone or earth, you aren't off-guard, and when you roll a success at one of these Acrobatics checks, you get a critical success instead\./, "Tu conexión innata con la piedra te convierte en un adepto en cruzar superficies irregulares. Puedes ignorar el terreno difícil causado por la piedra (como por ejemplo los escombros o la grava) y el terreno irregular de piedra y tierra. Además, cuando utilizas la habilidad Acrobacias para Mantener el equilibrio en superficies estrechas o terreno irregular hecho de piedra o tierra, no estás desprevenido y cuando consigues un éxito en una de estas pruebas de Acrobacias, en su lugar obtienes un éxito crítico."],
            [/Dwarves have a long history fighting common foes, and you've mastered the ancient tactics to better face these enemies\. You gain a \+1 circumstance bonus to damage with weapons and unarmed attacks against creatures with the giant, goblin, hryngar, or orc trait\. If your attack would deal more than one weapon die of damage \(as is common at higher levels than 1st\), the bonus is equal to the number of weapon dice or unarmed attack dice\./, "Los enanos tienen una larga historia de lucha contra enemigos comunes, y tú has dominado las antiguas tácticas que permiten enfrentarse mejor a dichos enemigos. Obtienes un bonificador +1 por circunstancia al daño con las armas y a los ataques sin armas contra las criaturas que tienen el rasgo gigante, goblin, hryngar u orco. Si tu ataque infligiría más de un dado de daño por arma (como suele ser común a niveles superiores al 1.º), el bonificador es igual al número de dados de arma o de dados de ataque sin armas."],
            [/In addition, if any creature critically succeeds at an attack against you and deals damage to you, you gain your bonus to damage against that creature for 1 minute regardless of whether it has the one of the listed traits\./, "Además, si cualquier criatura obtiene un éxito crítico en un ataque contra ti y te inflige daño, obtienes tu bonificador al daño contra dicha criatura durante 1 minuto tanto si tiene el rasgo elegido como si no."],
            [/Your kin have instilled in you an affinity for hard-hitting weapons, and you prefer these to more elegant arms\. You gain access to all uncommon weapons with the dwarf trait\. You have familiarity with weapons with the dwarf trait plus the battle axe, pick, and warhammer - for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\. At 5th level, whenever you get a critical hit with one of these weapons, you get its critical specialization effect\./, "Los tuyos te han instilado la afinidad por las armas que pegan fuerte, y las prefieres a otras armas más elegantes. Obtienes acceso a todas las armas poco comunes con el rasgo enano. Obtienes familiaridad con las armas con el rasgo enano además del hacha de batalla, el pico y el martillo de guerra; a efectos de competencia, tratarás cualquier arma marcial de éstas como una arma sencilla y cualquier arma avanzada de éstas como una arma marcial. A 5.º nivel, siempre que obtienes un impacto crítico con una de estas armas, obtienes su efecto de especialización crítica."],
            [/You've learned techniques first devised by your ancestors during their ancient wars, allowing you to comfortably wear massive suits of armor\. Ignore the reduction to your Speed from any armor you wear\./, "Has aprendido técnicas que fueron desarrolladas por tus antepasados durante sus antiguas guerras, lo que te permite vestir cómodamente armaduras enormes. Ignoras la reducción a tu Velocidad debido a cualquier armadura que llevas."],
            [/In addition, any time you're taking a penalty to your Speed for some other reason \(such as from the encumbered condition or from a spell\), deduct 5 feet from the penalty\. For example, the encumbered condition normally gives a –10-foot penalty to Speed, but this feat would reduce it to a –5-foot penalty\. If your Speed is taking multiple penalties, pick only one penalty to reduce\./, "Además, siempre que estás sufriendo un penalizador a tu Velocidad por algún otro motivo (por ejemplo, el estado impedido o a causa de un conjuro), resta 5 pies (1,5 m) del penalizador. Por ejemplo el estado impedido suele imponer un penalizador -10 pies (3 m) a la Velocidad, pero esta dote lo reduciría a un penalizador -5 pies (1,5 m). Si tu Velocidad está sufriendo múltiples penalizadores, elige sólo uno para aplicar."],
            [/You understand the intricacies of stonework\. You become trained in Crafting\. If you're already trained in Crafting, you instead gain the/, "Entiendes la complejidad del trabajo en piedra. Obtienes el rango entrenado en Artesanía. Si ya lo estabas, en su lugar obtienes la dote de habilidad Artesanía "],
            [/You also gain a \+2 circumstance bonus to Perception checks to notice unusual stonework\. This bonus applies to checks to discover mechanical traps made of stone or hidden within stone\./, "También obtienes un bonificador +2 por circunstancia a las pruebas de Percepción para darte cuenta de trabajos en piedra poco usuales. Este bonificador se aplica a las pruebas para descubrir trampas mecánicas hechas de piedra u ocultas en el interior de la piedra."],
            [/If you aren't using the Seek action or searching, the GM automatically rolls a secret check for you to notice unusual stonework anyway\. This check doesn't gain your normal circumstance bonus\./, "Si no estás utilizando la acción de Buscar o Registrando, el DJ hace automática e igualmente una prueba secreta por ti para darte cuenta de que hay una cantería inusual. Esta prueba no se beneficia de su bonificador habitual por circunstancia."],
            [/You eagerly absorbed the old stories and traditions of your ancestors, your gods, and your people, studying subjects and techniques passed down for generation upon generation\. You gain the trained proficiency rank in Crafting and Religion\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Additional Lore general feat for Dwarf Lore\./, "Absorbiste ávidamente los viejos relatos y tradiciones de tus antepasados, tus dioses y tu gente, estudiando temas y técnicas transmitidos de generación en generación. Obtienes competencia a rango entrenado en Artesanía y Religión. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. Obtienes también la dote general Saber adicional para Saber (enanos)."],
            [/You are naturally calm and collected in the face of imminent danger\. At the end of your turn, reduce your frightened condition by 2 instead of 1\./, "Eres de natural tranquilo y sereno frente a un peligro inminente. Al final de tu turno reduces en 2 tu estado asustado en lugar de 1."],
            [/Using ancient dwarven methods developed to fight enemies wielding magical darkness, you've honed your darkvision and sworn not to use such magic yourself\. You gain greater darkvision, enabling you to see through magical darkness even if it normally hampers darkvision \(such as the darkness created by a 4th-rank darkness spell\)\. You can't cast spells with the darkness trait, use item activations with the darkness trait, or use any other ability with the darkness trait\./, "Utilizando antiguos métodos enanos desarrollados para luchar contra los enemigos que utilizan oscuridad mágica, has refinado tu visión en la oscuridad y has jurado no utilizar dicha magia tú mismo. Obtienes visión en la oscuridad mayor, lo que te permite ver a través de oscuridad mágica, incluso si normalmente impide la visión en la oscuridad (como por ejemplo la creada por un conjuro de oscuridad de 4.º rango). No puedes lanzar conjuros con el rasgo oscuridad, usar activaciones de objeto con dicho rasgo ni utilizar aptitud alguna con el mismo rasgo."],
            [/You can use your knowledge of engineering and metalwork to temporarily strengthen thick objects and structures\. By spending 1 hour working on an item, you can give it a \+1 circumstance bonus to its Hardness for 24 hours\. If you're a master in Crafting, the bonus is \+2, and if you're legendary, the bonus is \+3\. You can reinforce a portion of a structure, though 1 hour usually reinforces only a door, a few windows, or another section that fits within a 10-foot cube\./, "Puedes utilizar tu conocimiento de la ingeniería y de la metalistería para reforzar temporalmente objetos gruesos y estructuras. Invirtiendo 1 hora de trabajo en un objeto, puedes proporcionar un bonificador +1 por circunstancia a su Dureza durante 24 horas. Si tienes el rango maestro en Artesanía, el bonificador es +2, y si tienes el rango legendario, el bonificador es +3. Puedes reforzar una parte de la estructura, aunque por lo general 1 hora sólo refuerza una puerta, unas cuantas ventanas u otra sección cúbica de 10 pies (3 m) de lado."],
            [/Your dwarven build allows you to push foes around, just like a mighty boulder tumbles through a subterranean cavern\. Take a Step into the square of a foe that is your size or smaller, and the foe must move into the empty space directly behind it\. The foe must move even if doing so places it in harm's way\. The foe can attempt a Fortitude saving throw against your Athletics DC to block your Step\. If the foe attempts this saving throw, it takes bludgeoning damage equal to your level plus your Strength modifier unless it critically succeeds\./, "Tu constitución enana te permite empujar a tus enemigos de aquí para allá, de la misma forma en que una gran roca rueda por una cámara subterránea. Da un Paso al interior de la casilla de un enemigo de tu tamaño o menor, y el enemigo deberá moverse al espacio vacío que tiene directamente detrás. El enemigo tiene que moverse incluso si haciéndolo se pone en peligro. El enemigo puede hacer una salvación de Fortaleza contra tu CD de Atletismo para bloquear tu Paso. Si la hace y no obtiene un éxito crítico, sufre tanto daño contundente como tu nivel más tu modificador por Fuerza."],
            [/If the foe can't move into an empty space \(if it is surrounded by solid objects or other creatures, for example\), your Boulder Roll has no effect\./, "Si el enemigo no puede moverse a un espacio vacío (por ejemplo si está rodeado de objetos sólidos u otras criaturas), tu Rodar la roca no tiene efecto alguno."],
            [/You have a deep reverence for and connection to stone\. You can cast one with stone as a 3rd-rank divine innate spell once per day\./, "Tienes una gran reverencia hacia la piedra y una conexión especial con ella. Puedes lanzar uno con la piedra como un conjuro innato divino de 3.er rango una vez al día."],
            [/If you have the Stonemason's Eye feat, you can attempt to find unusual stonework and stonework traps that require legendary proficiency in Perception\. If you have both Stonemason's Eye and legendary proficiency in Perception, when the GM rolls a secret check for you to notice unusual stonework, you keep your bonus from Stonemason's Eye\./, "Si tienes la dote Ojo del cantero, puedes buscar cantería inusual y trampas hechas de piedra que requieren una competencia en Percepción a rango legendario. Si tienes tanto Ojo del cantero como competencia en Percepción a rango legendario, cuando el DJ hace una tirada secreta por ti para detectar cantería inusual, mantienes tu bonificador debido al Ojo del cantero."],
            [/Your hardiness lets you withstand more punishment than most\. Increase your maximum Hit Points by your level\. When you have the dying condition, the DC of your recovery checks is equal to 9 \+ your dying value \(instead of 10 \+ your dying value\)\./, "Tu resistencia te permite soportar más castigo de lo habitual. Incrementa tus Puntos de Golpe máximos en una cantidad igual a tu nivel. Cuando te encuentras en el estado moribundo, la CD de tus pruebas de recuperación es igual a 9 + tu valor de moribundo (en lugar de 10 + tu valor de moribundo)."],
            [/If you also have the Toughness feat, the Hit Points gained from it and this feat are cumulative, and the DC of your recovery checks is equal to 6 \+ your dying value\./, "Si también dispones de la dote Dureza, los Puntos de Golpe obtenidos de ella y los de esta dote son acumulativos y la CD de tus pruebas de recuperación es igual a 6 + tu valor de moribundo."],
            [/You pause a moment to attune your senses to the stone around you\. Until the start of your next turn, you gain imprecise tremorsense with a range of 20 feet\./, "Te detienes un instante para sintonizar tus sentidos con la piedra que te rodea. Hasta el inicio de tu siguiente turno, obtienes sentido de la vibración impreciso con un rango de distancia de 20 pies (6 m)."],
            [/Your intractable nature can help you shrug off even the most grievous injuries\. Attempt a DC 17 flat check\. If you are successful, the attack becomes a normal hit\./, "Tu intratable naturaleza te puede ayudar a quitarte de encima incluso las heridas más graves. Haz una prueba plana CD 17. Si tienes éxito, el ataque se convierte en un impacto normal."],
            [/You channel strength from the earth beneath your feet to pummel your enemies\. When making a melee Strike against a target who is standing on the same earth or stone surface as you are, you gain a circumstance bonus to the damage roll equal to the number of weapon damage dice\./, "Canalizas la fuerza de la tierra que hay bajo tus pies para machacar a tus enemigos. Cuando das un Golpe cuerpo a cuerpo contra un objetivo que está de pie sobre la misma superficie de tierra o piedra que tú, obtienes un bonificador por circunstancia a la tirada de daño igual al número de dados de daño por arma."],
            [/You march through the earth and lead an ally along\. You gain a burrow Speed of 15 feet when you use this activity \(if you don't have a higher one\), and then you either Stride twice or Burrow twice\. You can choose one willing ally adjacent to you at the start of your movement to move with you\. That ally ends its movement one square behind you\./, "Atraviesas la tierra y llevas contigo a un aliado. Obtienes una Velocidad de excavar de 15 pies (4,5 m) cuando utilizas esta actividad (si no tienes una mayor) y a continuación, o bien das dos Zancadas, o bien Excavas dos veces. Puedes elegir un aliado voluntario adyacente a ti al inicio de tu movimiento para que se mueva contigo. Dicho aliado finaliza su movimiento una casilla detrás de ti."],
            [/The strength of stone overcomes you so strongly that it replaces your stout body\. You become petrified until the end of the current turn\. You don't take any damage from the triggering effect or any other ill effects that couldn't affect stone\./, "La fuerza de la piedra te invade de forma tan abrumadora que reemplaza a tu recio cuerpo. Quedas petrificado hasta el final del turno actual. No sufrirás ningún daño del efecto desencadenante ni ningún otro efecto negativo que no pueda afectar a la piedra."],
            [/Earthen barriers no longer impede your progress\. You gain magic passage as a 7th-rank divine innate spell that you can cast once per day\. Unlike the spell, however, this ability can be used only to open passages through barriers of earth or stone\./, "Las barreras hechas de tierra ya no impiden tu avance. Obtienes pasaje mágico como conjuro innato divino de 7.º rango que puedes lanzar una vez al día. Sin embargo, y a diferencia del conjuro, esta aptitud sólo se puede utilizar para abrir pasajes a través de barreras de tierra o piedra."],
            [/Your enhanced fey connection \(either through your blood or via prolonged contact with their kind\) affords you a warmer reception from creatures of the First World as well as tools to foil their tricks or withstand their magic\. You gain a \+2 circumstance bonus to both Perception checks and saving throws against fey\. In addition, whenever you meet a fey creature in a social situation, you can immediately attempt a Diplomacy check to Make an Impression on that creature rather than needing to converse for 1 minute\. You take a –5 penalty to the check\. If you fail, you can engage in 1 minute of conversation and attempt a new check at the end of that time rather than accepting the failure or critical failure result\./, "Tu conexión feérica mejorada (o bien a través de tu sangre o vía el contacto prolongado) te concede una recepción más cálida por parte de las criaturas del Primer Mundo, así como herramientas para frustrar sus trucos o resistir su magia. Obtienes un bonificador +2 por circunstancia, tanto a las pruebas de Percepción como a las tiradas de salvación contra las hadas. Además, siempre que te encuentras con una hada en una situación social, puedes hacer de inmediato una prueba de Diplomacia para Causar impresión a dicha criatura en lugar de tener que conversar durante 1 minuto. Tienes un penalizador -5 a esta prueba. Si fallas, puedes entablar una conversación de 1 minuto y hacer una nueva prueba al final de dicho tiempo en lugar de tener que aceptar un fallo o un fallo crítico."],
            [/You build a rapport with an animal, which becomes magically bonded to you\. You gain a familiar\. The type of animal is up to you, but most gnomes choose animals with a burrow Speed\./, "Creas una relación con un animal, que se vincula mágicamente contigo. Obtienes un familiar. El tipo de animal es cosa tuya, pero la mayoría de gnomos eligen animales que tienen Velocidad de excavar."],
            [/You've spent considerable time practicing the manipulation of light, weaponizing your blade's reflection or bolstering the luminosity of magical displays to unconventional heights\. Extend the duration of the blinded or dazzled condition you give the target by 1 round\./, "Has invertido una cantidad considerable de tiempo practicando la manipulación de la luz, convirtiendo en una arma el reflejo de tu espada o reforzando la luminosidad de las exhibiciones mágicas hasta alturas poco convencionales. Extiende en 1 asalto el estado cegado o deslumbrado que has impuesto a un objetivo."],
            [/You favor unusual weapons tied to your people, such as blades with curved and peculiar shapes\. You gain access to kukris and all uncommon weapons with the gnome trait\. You have familiarity with weapons with the gnome trait plus the glaive and kukri - for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\./, "Prefieres armas no usuales vinculadas a tu gente, como por ejemplo espadas con hojas curvas y peculiares. Obtienes acceso a los kukris y a todas las armas poco comunes con el rasgo gnomo. Obtienes familiaridad con las armas que tienen el rasgo gnomo además de la guja y del kukri; a efectos de competencia, tratas cualquier arma marcial de entre ellas como una arma sencilla y cualquier arma avanzada de entre ellas como una arma marcial."],
            [/Your connection to the First World grants you a primal innate spell, much like those of the fey\. Choose one cantrip from the primal spell list\. You can cast this spell as a primal innate spell at will\. A cantrip is heightened to a spell rank equal to half your level rounded up\./, "Tu conexión con el Primer Mundo te concede un conjuro innato primigenio, muy parecido a los de las hadas. Elige un truco de la lista de conjuros primigenios. Puedes lanzarlo a voluntad como un conjuro innato primigenio. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba."],
            [/You might have a flighty nature, but when a topic captures your attention, you dive into it headfirst\. You gain the Additional Lore feat and the Assurance feat for the chosen Lore\. As gnome obsessions can come and go quickly, you can retrain Gnome Obsession to a different Lore subcategory in 1 day of downtime\./, "Puede que tengas una naturaleza veleidosa, pero cuando un tema capta tu atención, te sumerges en él de cabeza. Obtienes la dote Saber adicional y la dote Seguro para el Saber elegido. Como quiera que las obsesiones de gnomo pueden ir y venir rápidamente, puedes reconvertir Obsesión de gnomo a una subcategoría diferente de Saber en 1 día de tiempo libre."],
            [/You hear animal sounds as conversations instead of unintelligent noise, and you can respond in turn\. You can ask questions of, receive answers from, and use the Diplomacy skill with animals\. In most cases, wild animals will give you time to make your case\. You gain a \+1 circumstance bonus to Make an Impression on animals\./, "Oyes los ruidos de los animales como conversaciones en lugar de como ruido ininteligible y puedes responder a tu vez. Puedes formularles preguntas, obtener respuestas y utilizar la habilidad Diplomacia con ellos. En la mayoría de circunstancias, los animales salvajes te concederán tiempo para exponer tus argumentos. Obtienes un bonificador +1 por circunstancia para Causarles impresión."],
            [/Your ancestors spent their days cloaked and cradled in illusions, and as a result, sensing illusion magic is second nature to you\. You gain a \+1 circumstance bonus to both Perception checks and Will saves against illusions\. When you come within 10 feet of an illusion that can be disbelieved, the GM rolls a secret check for you to disbelieve it, even if you didn't spend an action to Interact with the illusion\./, "Tus antepasados pasaban días envueltos en ilusiones y acunados en ellas y como resultado, ser consciente de la magia de ilusión es en ti algo instintivo. Obtienes un bonificador +1 por circunstancia, tanto a las pruebas de Percepción como a las tiradas de salvación de Voluntad contra las ilusiones. Cuando te acercas a menos de 10 pies (3 m) de una ilusión que se puede descreer, el DJ hace por ti una tirada secreta con el fin de descreerla, incluso si tú no inviertes una acción en Interactuar con la ilusión."],
            [/You can focus your mind more quickly thanks to the magic that flows within you\. You regain 1 Focus Point, up to your usual maximum\./, "Puedes enfocar tu mente con más rapidez debido a la magia que fluye en tu interior. Recuperas 1 Punto de Foco, hasta tu máximo usual."],
            [/Where others etch their armor to serve as a conduit for their imaginations, your vivid mind and bold personality allow you to project a more fitting persona over your lackluster armor\. You change the shape and appearance of your armor to appear as ordinary or fine clothes of your imagining\. The armor's statistics don't change\. This effect lasts as long as you remain conscious and are wearing the armor\. A creature can disbelieve the illusion by Seeking or touching your armor\. The DC equals your Will DC\./, "Donde otros graban su armadura para que sirva como conducto para sus imaginaciones, tu vívida mente y tu osada personalidad te permiten proyectar una personalidad más adecuada sobre tu deslucida armadura. Cambias la forma y la apariencia de tu armadura para que parezcan ropajes ordinarios o de calidad a juego con tu imaginación. Las estadísticas de la armadura no cambian. Este efecto durará mientras permanezcas consciente y lleves puesta la armadura. Una criatura puede descreer la ilusión Buscando o tocando tu armadura. La CD es igual a tu CD de Voluntad."],
            [/Over time your fey magic has grown stronger\. You gain invisibility and revealing light as 2nd-rank primal innate spells\. You can cast each of these primal innate spells once per day\./, "A lo largo del tiempo, tu magia feérica se ha hecho más fuerte. Obtienes invisibilidad y luz reveladora como conjuros innatos primigenios de 2.º rango. Puedes lanzar cada uno de ellos una vez al día."],
            [/Your connection to the First World has grown, and its vital energy flows into you rapidly\. If you rest for 10 minutes, you regain Hit Points equal to your Constitution modifier × half your level\. This is a healing vitality effect and is cumulative with any healing you receive from Treat Wounds\./, "Tu conexión con el Primer Mundo ha crecido y su energía vital fluye rápidamente hacia ti. Si descansas 10 minutos, recuperas tantos Puntos de Golpe como tu modificador por Constitución multiplicado por la mitad de tu nivel. Esto es un efecto de vitalidad y curación, acumulativo con cualquier curación obtenida de Tratar heridas."],
            [/You've learned a few magical techniques for getting yourself both into and out of trouble unnoticed\. You gain disguise magic and silence as 2nd-rank arcane or occult innate spells\. The tradition of these spells must match the tradition you use for your gnome ancestry options\. You can cast each spell once per day and can target only yourself\./, "Has aprendido unas pocas técnicas mágicas para meterte en problemas y salir de ellos sin ser visto. Obtienes disfrazar magia y silencio como conjuros innatos arcanos u ocultistas de 2.º rango. La tradición de dichos conjuros debe coincidir con la tradición que utilizas para tus opciones de ascendencia de gnomo. Puedes lanzar cada conjuro una vez al día y sólo puedes designarte a ti mismo como objetivo."],
            [/You phase through a space that a living creature occupies in a flash, spontaneously appearing on the opposite side of it in a vibrant display of colorful light\. You move from your current location to another location that's still adjacent to the same living creature, but on the opposite side or corner of the creature's space\. To determine whether a position is valid, use the same rules as for flanking: a line through the center of the two spaces must pass through opposite sides or corners of the creature's space\./, "Entras en fase a través de un espacio ocupado por una criatura viva con un fogonazo, apareciendo de forma espontánea al otro lado de la misma en una exhibición vibrante de luces de colores. Te mueves de tu ubicación actual a otra que sigue estando adyacente a la misma criatura viva, pero en el lado o esquina opuesto de su espacio. Para determinar si una posición es válida, utiliza las mismas reglas que para el flanqueo: una línea a través del centro de ambos espacios debe atravesar lados u esquinas opuestos del espacio de la criatura."],
            [/You pass through the creature's life force, appearing in the selected location; this doesn't trigger reactions based on movement\. You must be able to see your destination, and you can't move farther than your Speed would allow\./, "Atraviesas la fuerza vital de la criatura, apareciendo en la ubicación seleccionada, lo que no desencadena reacciones basadas en el movimiento. Debes ser capaz de ver tu destino y no puedes moverte más allá de lo que permitiría a tu Velocidad."],
            [/The magic within you manifests as a natural reaction to threats\. An illusory double of you appears in your space for a brief moment\. The triggering attacker must roll a DC 10 flat check; on a success, the attack targets you normally; if they fail, the attack targets the double and destroys it\. The tradition of this action matches the tradition of your gnome ancestry options\./, "La magia de tu interior se manifiesta como una reacción natural a las amenazas. Un doble ilusorio de ti aparece en tu espacio durante un breve instante. El atacante desencadenante debe hacer una prueba plana CD 10; con un éxito, te designa como objetivo de la forma normal; si falla, designa como objetivo al doble y lo destruye. La tradición de esta acción coincide con la tradición que utilizas para tus opciones de ascendencia de gnomo."],
            [/The connection between you and the First World resonates within your body stronger than it does for most gnomes, allowing you to cross the threshold between the Universe and the First World\. You gain interplanar teleport as a primal innate spell\. You can cast it twice per week\. This can be used only to travel back and forth between the First World and the Universe\. Due to your body's natural resonance, you can act as a locus for the spell, and you don't require a specially attuned planar key\./, "La conexión que tienes con el Primer Mundo resuena en tu cuerpo, con más fuerza que en la mayoría de los gnomos, lo que te permite cruzar el umbral entre el Universo y el Primer Mundo. Obtienes teletransporte interplanario como conjuro innato primigenio. Puedes lanzarlo dos veces por semana. Esto se puede utilizar tan solo para ir y venir entre el Primer Mundo y el Universo. Debido a la resonancia natural de tu cuerpo, puedes actuar como epicentro del conjuro y no necesitas una llave planaria especialmente sintonizada."],
            [/Fire fascinates you\. Your spells and alchemical items that deal fire damage gain a status bonus to damage equal to half the spell's rank or one-quarter the item's level \(minimum bonus \+1\)\. You also gain a \+1 status bonus to any persistent fire damage you deal\./, "El fuego te fascina. Tus conjuros y tus sustancias alquímicas que infligen daño por fuego obtienen un bonificador por estatus al daño igual a la mitad del rango de conjuro o una cuarta parte del nivel de objeto del material (bonificador mínimo +1). También obtienes un bonificador +1 por estatus a cualquier daño persistente por fuego que infliges."],
            [/You sing annoying goblin songs, distracting your foes with silly and repetitive lyrics\. Attempt a Performance check against the Will DC of a single enemy within 30 feet\. This has all the usual traits and restrictions of a Performance check to sing\. You can affect up to two targets within range if you have expert proficiency in Performance, four if you have master proficiency, and eight if you have legendary proficiency\./, "Cantas molestas canciones goblin, distrayendo a tus enemigos con rimas tontas y repetitivas. Haz una prueba de Interpretar contra la CD de Voluntad de un solo enemigo a 30 pies (9 m) o menos. Esto tiene todos los rasgos y restricciones habituales de una prueba de Interpretar para cantar. Puedes afectar hasta a 2 objetivos dentro del rango de distancia si tienes competencia a rango experto en Interpretar, a 4 si tu rango es maestro y a 8 si tu rango es legendario."],
            [/You know that the greatest treasures often look like refuse\. You gain a \+1 circumstance bonus to checks to Subsist, and you can use Society or Survival when you Subsist in a settlement\. When you Subsist in a city, you also gather valuable junk that silly longshanks threw away\. You can Earn Income using Society or Survival at the same time while you Subsist, without spending any additional days of downtime\. You also gain a \+1 circumstance bonus to this check\./, "Sabes que los mayores tesoros a menudo parecen basura. Obtienes un bonificador +1 por circunstancia a las pruebas para Subsistir y puedes utilizar Sociedad o Supervivencia cuando Subsistes en un asentamiento. Cuando Subsistes en una ciudad, también reúnes basura valiosa que los atontados de los patilargos suelen tirar. Puedes Obtener ingresos utilizando Sociedad o Supervivencia a la vez que Subsistes, sin tener que invertir ningún día adicional de tiempo libre. También obtienes un bonificador +1 por circunstancia a esta prueba."],
            [/If you have the irongut goblin heritage, increase the bonuses to \+2\./, "Si tienes la herencia goblin tripas de hierro, incrementa a +2 los bonificadores."],
            [/Others might look upon them with disdain, but you know that the weapons of your people are as effective as they are sharp\. You gain access to all uncommon weapons with the goblin trait\. You have familiarity with weapons with the goblin trait - for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\./, "Otros pueden mirarlas con desdén, pero tú sabes que las armas de tu gente son tan efectivas como afiladas. Estás entrenado en todas las armas poco comunes con el rasgo goblin. Tienes familiaridad con todas las armas con el rasgo goblin; a efectos de competencia, tratas todas las que son armas marciales como sencillas y todas las que son avanzadas como marciales."],
            [/You take advantage of your ally's movement to adjust your position\. You Step\./, "Sacas partido del movimiento de tu aliado para ajustar tu posición. Das un Paso."],
            [/You are especially good at riding traditional goblin mounts\. You gain the Ride feat, even if you don't meet the prerequisites\. You gain a \+1 circumstance bonus to Nature checks to use Command an Animal on a goblin dog or wolf mount\. If you gain a wolf as an animal companion, it gains the mount special ability \(and if you gain an ability that grants you an animal companion with the mount special ability, you can choose a wolf\)\./, "Eres especialmente bueno con las monturas tradicionales de los goblins. Obtienes la dote Montar, incluso si no cumples los prerrequisitos. Obtienes un bonificador +1 por circunstancia a las pruebas de Naturaleza para Comandar a un animal sobre un perro goblin o sobre un lobo de monta. Si obtienes un lobo como compañero animal, éste obtiene la aptitud especial montura (y si obtienes una aptitud que te concede un compañero animal con la aptitud especial montura, puedes elegir un lobo)."],
            [/Taller folk rarely pay attention to the shadows at their feet, and you take full advantage of this\. You can move 5 feet farther when you take the Sneak action, up to your Speed\. In addition, as long as you continue to use Sneak actions and succeed at your Stealth check, you don't become observed if you don't have cover or greater cover and aren't concealed at the end of the Sneak action, as long as you have cover or greater cover or are concealed at the end of your turn\./, "La gente grande raramente presta atención a las sombras que tiene a sus pies, y tú te aprovechas de ello por completo. Puedes moverte 5 pies (1,5 m) más lejos cuando utilizas la acción Movimiento furtivo, hasta tu Velocidad. Además, mientras continúes utilizando acciones de Movimiento furtivo y tengas éxito en tu prueba de Sigilo, no quedarás observado si careces de cobertura o de cobertura mayor y no estás oculto al final de la acción de Sigilo, si dispones de cobertura o cobertura mayor o estás oculto al final de tu turno."],
            [/You've picked up skills and tales from your goblin community\. You gain the trained proficiency rank in Nature and Stealth\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Additional Lore general feat for Goblin Lore\./, "Has adquirido habilidades y relatos en tu comunidad goblin. Obtienes el rango de competencia entrenado en Naturaleza y Sigilo. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes la dote general Saber adicional para Saber (goblins)."],
            [/You can make useful tools out of even twisted or rusted scraps\. When using the Crafting skill to Craft, you can make level 0 items, including weapons and armor, out of junk\. This reduces the Price to one-quarter the usual amount but always results in a shoddy item\. Shoddy items normally give a penalty, but you don't take this penalty when using shoddy items you made \(nor does the worse check penalty of shoddy armor you made apply to you\)\./, "Puedes fabricar herramientas útiles, incluso de los desechos más retorcidos u oxidados. Cuando utilizas la habilidad Artesanía para Fabricar, puedes hacer objetos de nivel 0 (incluyendo armas y armaduras) a partir de chatarra. Esto reduce el Precio a una cuarta parte de la cantidad usual, pero siempre resulta en un objeto de baja calidad. Los objetos de baja calidad normalmente imponen un penalizador, pero tú no lo sufres si utilizas objetos chapuceros fabricados por ti mismo (y tampoco se te aplica el mayor penalizador debido a una armadura chapucera)."],
            [/You can also incorporate junk to save money while you Craft any item\. This grants you a discount on the item as if you had spent 1 additional day working to reduce the cost, but the item is obviously made of junk\. At the GM's discretion, this might affect the item's resale value depending on the buyer's tastes\./, "También puedes incorporar chatarra para ahorrar dinero cuando Fabricas algún objeto. Esto te concede un descuento en el objeto como si hubieras invertido 1 día adicional trabajando para reducir el coste, pero es obvio que el objeto está hecho a base de chatarra. A discreción del DJ, esto podría afectar el valor de reventa del objeto, dependiendo de los gustos del comprador."],
            [/Staying on pitch, proper breath control, and remembering the words are all less important than the real measure of a good singer: volume! The range of your Goblin Song is increased to 60 feet, and you can target one additional enemy when you use it\./, "Afinar, controlar la respiración adecuadamente y recordar la letra son cosas mucho menos importantes que la medida real de un buen cantante: ¡el volumen! El rango de distancia de tu Canción goblin se incrementa a 60 pies (18 m) y puedes designar como objetivo a un enemigo adicional cuando la usas."],
            [/You deliver a punishing blow to an enemy's knee, shin, or other vulnerable anatomy within your reach\. Make a melee Strike with a melee weapons or melee unarmed attack\. This attack doesn't deal damage\. On a hit, the target takes a -10-foot status penalty to its Speed \(or a –15-foot status penalty on a critical hit\)\. The penalty lasts for 1 round\. This penalty applies only if the target has a land Speed and depends on legs or other targetable appendages to use its land Speed\. As with all penalties to Speed, this can't reduce a creature's Speed below 5 feet\./, "Asestas un tremendo golpe a la rodilla, la espinilla u otra parte vulnerable a tu alcance de la anatomía de un enemigo. Da un Golpe cuerpo a cuerpo con una arma cuerpo a cuerpo o un ataque sin armas cuerpo a cuerpo. Este ataque no inflige daño. Con un impacto, el objetivo sufre un penalizador -10 pies (3 m) por estatus a su Velocidad (o un penalizador -15 pies [4,5 m] por estatus con un impacto crítico). El penalizador dura 1 asalto. Este penalizador sólo se aplica si el objetivo tiene Velocidad terrestre y depende de piernas u otros apéndices que puedan ser designados como objetivo para utilizar su Velocidad terrestre. Como con todos los penalizadores a la Velocidad, este ataque no puede reducir la de una criatura por debajo de 5 pies (1,5 m)."],
            [/You have a knack for breaking and dismantling things\. Putting them back together is the boring part, so you largely don't bother with that\. You become trained in Thievery\. If you would automatically become trained in Thievery \(from your background or class, for example\), you instead become trained in a skill of your choice\. In addition, whenever you hit with a Strike against a trap or an unattended object, you ignore the first 5 points of the object's Hardness\./, "Eres hábil rompiendo y desmantelando cosas. Volverlas a montar es la parte aburrida, así que no te sueles preocupar mucho de ello. Obtienes el rango entrenado en Latrocinio. Si ya dispones de él automáticamente (por ejemplo, debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. Además, siempre que aciertas con un Golpe contra una trampa o un objeto desatendido, ignoras los primeros 5 puntos de la Dureza del objeto."],
            [/You hang onto a foe to harry them into submission\. If your target moves while you're hanging onto it, you can choose to move with the target\. The target is released if you choose not to move with it, at the start of your next turn, or if the target Escapes\. Attempts to Escape from a Cling are made against your Acrobatics DC, but they end the Cling instead of the conditions normally ended by the Escape action\./, "Te acercas a un enemigo para someterlo. Si tu objetivo se mueve mientras estás aferrado a él, puedes elegir moverte con él. El objetivo queda liberado si eliges no hacerlo, al inicio de tu siguiente turno o si el objetivo Huye. Los intentos de Huir de un Aferramiento se hacen contra tu CD de Acrobacias, pero acaban con el Aferramiento en lugar de con los estados que normalmente acaban mediante la acción de Huir."],
            [/You can scuttle farther and faster when maneuvering alongside allies\. When you use Goblin Scuttle, you can Stride up to half your Speed instead of Stepping\./, "Puedes ir más lejos y más rápido cuando maniobras junto a tus aliados. Cuando utilizas huida goblin, puedes dar una Zancada hasta la mitad de tu Velocidad en lugar de un Paso."],
            [/After years of clambering through caverns, you can climb easily anywhere you go\. You gain a climb Speed of 10 feet\./, "Después de años de arrastrarte por cavernas, puedes trepar fácilmente a cualquier parte. Obtienes una Velocidad de trepar de 10 pies (3 m)."],
            [/You can move up to your Speed when you use the Sneak action, and you no longer need to have cover or greater cover or be concealed to Hide or Sneak\./, "Puedes moverte hasta tu Velocidad cuando utilizas la acción Movimiento furtivo y ya no necesitas cobertura o cobertura mayor o estar oculto para Esconderte o usar Movimiento furtivo."],
            [/Despite a lifetime filled with questionable decisions, you've managed to survive, as though you have uncanny luck that lets you avoid the consequences of your own actions\. For the remainder of your turn, if you roll a failure or critical failure on a saving throw against a harmful effect, you get a success instead\. Further, if you would take damage from an enemy or hazard this turn you take the minimum possible damage\./, "A pesar de una vida llena de decisiones cuestionables, has conseguido sobrevivir, como si tuvieras una suerte increíble que te permite evitar las consecuencias de tus acciones. Durante el resto de tu turno, si obtienes un fallo o un fallo crítico en una tirada de salvación contra un efecto dañino, en su lugar obtienes un éxito. Además, si sufrirías daño de un enemigo o peligro este turno, sufres el daño mínimo posible."],
            [/These benefits apply only to harmful effects incurred entirely during your turn in which you activate Reckless Abandon, such as running through a wall of fire\. Persistent damage and conditions that were applied prior to your turn proceed normally, and as soon as your turn ends you are subject to the full consequences of any dangers still threatening you\./, "Estos beneficios solo se aplican a los efectos dañinos sufridos por completo durante tu turno en el que activas Abandono temerario, como por ejemplo atravesar corriendo un muro de fuego. El daño persistente y los estados que se aplicaron antes a tu turno funcionan con normalidad, y en cuanto el turno acabe te verás sujeto a las consecuencias completas de cualquier peligro que aún te amenace."],
            [/You were raised to be ambitious and always reach for the stars, leading you to progress quickly in your chosen field\. You gain a 1st-level class feat for your class\. You must meet the prerequisites, but you can select the feat later in the character creation process in order to determine which prerequisites you meet\./, "Te criaron para ser ambicioso y aspirar siempre a las estrellas, lo que hizo que progresaras rápidamente en tu campo elegido. Obtienes una dote de clase de 1.er nivel para tu clase. Debes cumplir los prerrequisitos, pero puedes seleccionar la dote más adelante en el proceso de creación de personaje a fin de determinar qué prerrequisitos cumples."],
            [/You've familiarized yourself with a particular weapon, potentially from another ancestry or culture\. Choose an uncommon simple or martial weapon with a trait corresponding to an ancestry \(such as dwarf, goblin, or orc\) or that is common in another culture\. You gain access to that weapon, and for the purpose of proficiency, you treat it as a simple weapon\. If you are trained in all martial weapons, you can instead choose an uncommon advanced weapon that has an ancestry's trait or is common in another culture\. You gain access to that weapon and have familiarity with that weapon\. For the purpose of proficiency, you treat it as a martial weapon\./, "Te has familiarizado con una arma en particular, potencialmente de otra ascendencia o cultura. Elige una arma poco común sencilla o marcial con un rasgo correspondiente a una ascendencia (como por ejemplo enano, goblin u orco) o que es común en otra cultura. Obtienes acceso a dicha arma y a efectos de competencia, la tratas como si fuera una arma sencilla. Si estás entrenado en todas las armas marciales, en su lugar puedes elegir una arma poco común avanzada con un rasgo de ascendencia o que es común en otra cultura. Obtienes acceso a dicha arma y obtienes familiaridad con la misma. A efectos de competencia, la tratas como una arma marcial."],
            [/Your adaptability manifests in your mastery of a range of useful abilities\. You gain a 1st-level general feat\. You must meet the feat's prerequisites, but if you select this feat during character creation, you can select the feat later in the process in order to determine which prerequisites you meet\./, "Tu adaptabilidad se manifiesta en tu dominio de un amplio abanico de aptitudes útiles. Obtienes una dote general de 1.er nivel. Debes cumplir los prerrequisitos de la dote pero, si la seleccionas durante la creación de personaje, puedes seleccionarla más tarde en el proceso a fin de determinar qué prerrequisitos cumples."],
            [/Your ingenuity allows you to learn a wide variety of skills\. You gain the trained proficiency rank in two skills of your choice\./, "Tu ingenio te permite entrenar una amplia gama de habilidades. Obtienes el rango de competencia entrenado en dos habilidades a tu elección."],
            [/The short human life span lends perspective and has taught you from a young age to set aside differences and work with others to achieve greatness\. You gain a \+4 circumstance bonus on checks to Aid\./, "La corta esperanza de vida humana concede perspectiva y te ha enseñado desde una edad temprana a dejar a un lado las diferencias y trabajar con otros para llegar a la grandeza. Obtienes un bonificador +4 por circunstancia a las pruebas de Prestar ayuda."],
            [/Your powerful ego makes it harder for others to order you around\. If you roll a success on a saving throw against a mental effect that attempts to directly control your actions, you critically succeed instead\. If a creature rolls a failure on a check to Coerce you using Intimidation, it gets a critical failure instead \(so it can't try to Coerce you again for 1 week\)\./, "Tu poderoso yo hace difícil que los demás te den órdenes. Si obtienes un éxito en una tirada de salvación contra un efecto mental que intenta controlar directamente tus acciones, en su lugar obtienes un éxito crítico. Si una criatura sufre un fallo en una prueba para Obligarte utilizando la Intimidación, en su lugar sufre un fallo crítico (por lo que no puede intentar Obligarte de nuevo durante 1 semana)."],
            [/Through study of multiple magical traditions, you've altered a spell to suit your spellcasting style\. Choose one cantrip from a magical tradition other than your own\. If you prepare spells, you can choose this spell when you prepare your cantrips, in addition to your other options\. If you have a spell repertoire, replace one of your cantrips known with the chosen spell\. You can cast this cantrip as a spell of your class's tradition\./, "A través del estudio de múltiples tradiciones mágicas, has alterado un conjuro para que encaje en tu estilo de lanzamiento. Elige un truco de una tradición mágica diferente a la tuya. Si preparas conjuros, puedes elegir éste cuando preparas tus trucos, además de tus demás opciones. Si tienes un repertorio de conjuros, reemplaza uno de los trucos que conoces por el elegido. Puedes lanzar este truco como un conjuro de la tradición de tu clase."],
            [/If you swap or retrain this cantrip later, you can choose its replacement from the same alternate tradition or a different one\./, "Si más adelante cambias este truco o lo reconviertes, puedes elegir su sustituto de la misma tradición alternativa o de una diferente."],
            [/You've continued adapting your magic to blend your class's tradition with your adapted tradition\. Choose a cantrip or 1st-rank spell from the same magical tradition as your cantrip from Adapted Cantrip\. You gain that spell, adding it to your spell options just like the cantrip from Adapted Cantrip\. You can cast this spell as a spell of your class's magical tradition\. If you choose a 1st-rank spell, you don't gain access to the heightened versions of that spell, meaning you can't prepare them if you prepare spells and you can't learn them or select the spell as a signature spell if you have a spell repertoire\./, "Has continuado adaptando tu magia para fusionar la tradición de tu clase con tu tradición adaptada. Elige un truco o un conjuro de 1.er rango de la misma tradición mágica que tu truco de Truco adaptado. Obtienes dicho conjuro, añadiéndolo a tus opciones de conjuro igual que el truco de Truco adaptado. Puedes lanzarlo como si fuera de la tradición mágica de tu clase. Si eliges un conjuro de 1.er rango, no obtienes acceso a las versiones potenciadas del mismo, lo que significa que no puedes prepararlas si preparas conjuros y que no puedes aprenderlas o seleccionar el conjuro como uno de signatura si dispones de un repertorio de conjuros."],
            [/You've learned how to handle situations when you're out of your depth\. You gain the Untrained Improvisation general feat\. In addition, you can attempt skill actions that normally require you to be trained, even if you are untrained\./, "Has aprendido a manejar las situaciones cuando te encuentras fuera de lugar. Obtienes la dote general Improvisación no entrenada. Además, puedes llevar a cabo acciones de habilidad que normalmente re- quieren estar entrenado, incluso si no lo estás."],
            [/Like many humans raised in a close-knit community, you have always been strongly attuned to the presence of others\. Willing allies that you are aware of within 60 feet that would otherwise be undetected by you are instead hidden from you\. The flat check for you to target willing allies within 60 feet that are hidden from you is 5 instead of 11\./, "Como muchos humanos criados en una comunidad cerrada, siempre has estado fuertemente sintonizado con la presencia de otros. Los aliados voluntarios de los que eres consciente y que están a 60 pies (18 m) o menos de ti y que por lo demás estarían no detectados, en su lugar se consideran escondidos de ti. La prueba plana para designar como objetivos a aliados voluntarios a 60 pies (18 m) o menos que están escondidos de ti se reduce a 5 en lugar de 11."],
            [/You have developed a soul-deep bond with your comrades and maintain an even greater degree of cooperation with them\. If you are at least an expert in the skill you are Aiding, when you roll a failure or critical failure to Aid a skill check, you get a success instead\./, "Has desarrollado un vínculo anímico con tus camaradas y mantienes con ellos un grado aún mayor de cooperación. Si tienes por lo menos el rango experto en la habilidad en la que estas Prestando ayuda, cuando sufres un fallo o un fallo crítico Prestando ayuda en una prueba de habilidad, en su lugar obtienes un éxito."],
            [/A stroke of brilliance gives you a major advantage with a skill despite your inexperience\. Gain a \+4 circumstance bonus to the triggering skill check\./, "Un destello de brillantez te concede una ventaja importante en una habilidad a pesar de tu inexperiencia. Obtienes un bonificador +4 por circunstancia a la prueba de habilidad desencadenante."],
            [/You've learned to split your focus between multiple classes with ease\. You gain a 2nd-level multiclass dedication feat, even if you normally couldn't take another dedication feat until you take more feats from your current archetype\. If you have the aiuvarin versatile heritage, you don't need to meet the feat's attribute modifier prerequisites\./, "Has aprendido a dividir tu enfoque con facilidad entre clases múltiples. Obtienes una dote de dedicación multiclase de 2.º nivel, incluso si normalmente no podrías adquirir otra dote de dedicación hasta que adquirieras más dotes de tu arquetipo actual. Si tienes la herencia versátil aiuvarin, no necesitas cumplir los prerrequisitos de modificador por atributo de la dote."],
            [/Your upbringing emphasized teamwork, and helping your allies comes naturally to you\. After you Aid an ally at a skill check that doesn't have the attack trait, you can also Aid any other ally who attempts the same skill check for the same purpose that round\. You do so as a free action rather than a reaction\./, "Tu educación puso énfasis en la labor de equipo, y ayudar a tus aliados es para ti algo natural. Después de Prestar ayuda a un aliado en una prueba de habilidad que no tiene el rasgo ataque, también puedes Prestar ayuda a cualquier otro aliado que lleva a cabo la misma prueba de habilidad para el mismo propósito ese mismo asalto. En ese caso, la acción se considera gratuita en lugar de una reacción."],
            [/The preparation you did to help must still apply to the other allies, and you can Aid each ally only once\. For example, if you helped lift up an ally to Aid them on an Athletics check to scale a wall, you could keep the same posture to give a boost to other allies attempting to scale the wall in the same round\./, "La preparación que hiciste para ayudar tiene que poderse aplicar a los otros aliados, y tan solo puedes Prestar ayuda a cada aliado una vez. Por ejemplo, si has ayudado a aupar a un aliado para Prestarle ayuda en una prueba de Atletismo para escalar una pared, podrías mantener la misma postura para aupar a otros aliados que intentan escalar la pared en el mismo asalto."],
            [/There's no journey too far or burden too heavy when you have friends at your side or hope within your heart\. Increase your maximum and encumbered Bulk limits by 1\. In addition, you gain a \+10-foot circumstance bonus to your Speed during overland travel\./, "No hay viaje demasiado largo ni carga demasiado pesada cuando tienes amigos a tu lado o esperanza en tu corazón. Incrementa en 1 tus límites máximo e impedido de Impedimenta. Además, obtienes un bonificador +10 pies (3 m) por circunstancia a tu Velocidad cuando haces viajes de largo recorrido."],
            [/Over the long course of your adventuring life, your adaptability has let you pick up numerous useful abilities\. You gain a general feat of 7th level or lower\. You must meet the feat's prerequisites\./, "A lo largo de tu vida aventurera, tu adaptabilidad te ha permitido obtener numerosas aptitudes útiles. Obtienes una dote general de 7.º nivel o inferior. Debes cumplir los prerrequisitos de la dote."],
            [/Humans are renowned for their ability to persist through the most grueling of trials that would leave others ready to drop\. When you would become fatigued, attempt a DC 17 flat check\. On a success, you aren't fatigued\. If the fatigued condition has an underlying cause that you don't address, such as lack of rest, you must attempt the check again at an interval determined by the GM until you fail the flat check or address the underlying cause\./, "Los humanos son famosos por su aptitud de persistir a lo largo de las pruebas más penosas, que dejarían a otros a punto de desplomarse. Cuando quedarías fatigado, haz una prueba plana CD 17. Con un éxito, no estás fatigado. Si el estado fatigado tiene una causa subyacente que no remedias, como por ejemplo la falta de descanso, deberás hacer la prueba de nuevo en un intervalo determinado por el DJ hasta que falles la prueba plana o remedies la causa subyacente."],
            [/You recover from near-death experiences with astounding resilience\. Don't increase the value of your wounded condition due to losing the dying condition\./, "Te recuperas de las experiencias cercanas a la muerte con una resiliencia sorprendente. No incrementas el valor de tu estado herido al perder el estado moribundo."],
            [/The blood of heroes courses through your veins, and you inspire your allies to dig deep and find a new level of resolve\. You grant up to 10 willing creatures within 30 feet the effects of a 6th-rank zealous conviction, though the effect automatically ends on a target if you give that target a command they would normally find repugnant\. This action has the auditory trait or visual trait, depending on how you inspire your allies\./, "La sangre de los héroes recorre tus venas e inspiras a tus aliados para armarse de valor y encontrar un nuevo nivel de resolución. Concedes hasta a 10 criaturas voluntarias a 30 pies (9 m) o menos los efectos de un conjuro de convicción celosa de 6.º rango, aunque el efecto acaba automáticamente sobre un objetivo si le das una orden que normalmente encontraría repugnante. Esta acción tendrá el rasgo auditivo o visual, dependiendo de cómo inspires a tus aliados."],
            [/You can extend a tangle of vines or tendrils to support your arms and extend your reach\. When you wield a melee weapon that requires two hands, doesn't have reach, and deals at least 1d6 damage, you can change between a typical two-handed grip and an extended two-handed grasp using an Interact action\. Weapons wielded in your extended grasp gain reach of 10 feet\. This grasp is less stable and powerful than a typical grip, reducing the weapon's damage die by 1 step\./, "Puedes extender una maraña de enredaderas o de zarcillos para sostener tus brazos y aumentar tu alcance. Cuando empuñas una arma cuerpo a cuerpo que requiere dos manos, no tiene alcance e inflige por lo menos 1d6 de daño, puedes cambiar entre un agarre típico a dos manos y un agarre a dos manos extendido utilizando una acción de Interactuar. Las armas empuñadas en el agarre extendido obtienen un alcance de 10 pies (3 m). Este agarre es menos estable y potente que un agarre típico, lo que reduce en 1 paso el tamaño del dado de daño del arma."],
            [/Your size and demeanor make it easy for you to convince others that you mean no harm\. You gain the Shameless Request skill feat as a bonus feat\. Additionally, you gain a \+1 circumstance bonus to initiative checks when you roll Deception for initiative\./, "Tu tamaño y su comportamiento facilitan convencer a los demás de que no quieres hacerles daño. Obtienes la dote de habilidad Petición descarada como dote adicional. Además, obtienes un bonificador +1 por circunstancia a las pruebas de iniciativa cuando tiras Engaño para la iniciativa."],
            [/Your spirit has endured many challenges over its long existence\. You gain a \+1 circumstance bonus to saves against emotion effects\. If you roll a success on a saving throw against an emotion effect, you get a critical success instead\./, "Tu espíritu ha soportado muchos desafíos a lo largo de tu dilatada existencia. Obtienes un bonificador +1 por circunstancia a las salvaciones contra los efectos de emoción. Si obtienes un éxito en una tirada de salvación contra un efecto de emoción, en su lugar obtienes un éxito crítico."],
            [/You deeply understand your people's cultural traditions and innate strengths\. You gain the trained proficiency rank in Nature and Stealth\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\./, "Entiendes profundamente las tradiciones culturales de tu gente y sus fortalezas innatas. Obtienes el rango de competencia entrenado en Naturaleza y Sigilo. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección."],
            [/You also gain the Additional Lore general feat for Leshy Lore\./, "Obtienes también la dote general Saber adicional para Saber (leshys)."],
            [/It's difficult to notice your passage through wild areas\. As long as you're not in an urban environment, you're always considered to be Covering Tracks, even if you chose a different activity in exploration mode\./, "Es difícil percibir tu paso por las áreas salvajes. Si no estás en un entorno urbano, se considera que siempre estás Cubriendo tus rastros, incluso si has elegido una actividad diferente en el modo exploración."],
            [/You notice spirits that inhabit objects, learning which bring good fortune and which are unlucky\. You focus on the power of a lucky object, granting you a \+1 circumstance bonus to your saving throw against the triggering effect\./, "Percibes los espíritus que habitan en los objetos, averiguando cuáles dan buena suerte y cuáles traen mal fario. Te enfocas en el poder de un objeto afortunado, lo que te concede un bonificador +1 por circunstancia a tu tirada de salvación contra el efecto desencadenante."],
            [/You have a connection with creatures that share your physiology\. You can ask questions of, receive answers from, and use the Diplomacy skill with plants and fungi\. You gain a \+2 circumstance bonus to Diplomacy checks with plants or fungi of your kind\. Generally, fungus leshies get this bonus with mushrooms and fungi; gourd leshies with gourds, melons, and similar fruiting plants; leaf leshies with deciduous trees; and vine leshies with vines and climbing plants\./, "Tienes una conexión con las criaturas que comparten tu fisiología. Puedes formularles preguntas, recibir respuestas y utilizar la habilidad Diplomacia con plantas y hongos. Obtienes un bonificador +2 por circunstancia a las pruebas de Diplomacia con las plantas u hongos de tu especie. Por lo general, los leshys de los hongos obtienen este bonificador con los champiñones y los hongos; los leshys de los frutos con calabazas, melones y plantas frutales similares; los leshys de las hojas con los árboles de hoja caduca; y los leshys de las vides con las enredaderas y plantas trepadoras."],
            [/Using your own leaves, you can control your descent\. You glide slowly toward the ground, 5 feet down and up to 25 feet forward through the air\. As long as you spend at least 1 action gliding each round and have not yet reached the ground, you remain in the air at the end of your turn\./, "Utilizando tus propias hojas, puedes controlar tu descenso. Planeas lentamente hacia el suelo, 5 pies (1,5 m) hacia abajo y hasta 25 pies (7,5 m) hacia adelante por el aire. Mientras inviertas por lo menos 1 acción planeando cada asalto y aún no hayas llegado al suelo, permanecerás en el aire al final de tu turno."],
            [/Small roots sprout from your feet, steadying you as you move\. You gain the Steady Balance skill feat, even if you aren't trained in Acrobatics, and you can use the Anchor action\./, "Pequeñas raíces brotan de tus pies, estabilizándote mientras te mueves. Obtienes la dote de habilidad Equilibrio firme, incluso si no dispones del rango entrenado en Acrobacias y puedes utilizar la acción Anclar."],
            [/Anchor/, "Anclar"],
            [/You can temporarily revert to a less conspicuous form without diminishing your senses\. You take the form of an ordinary specimen of the type of plant or fungus that most closely resembles you, reverting to your body's appearance just before your spirit joined with it\. This otherwise has the effects of one with plants, except that your size remains Small\./, "Puedes revertir temporalmente a una forma menos visible sin disminuir tus sentidos. Adoptas la forma de un espécimen ordinario del tipo de planta u hongo que más se parece a ti, retornando a la apariencia de tu cuerpo antes de que tu espíritu se uniera a él. Por lo demás esto tiene los efectos de uno con las plantas, excepto que tu tamaño sigue siendo Pequeño."],
            [/You wield primal magic\. You can cast entangling flora and oaken resilience as 2nd-rank primal innate spells once per day each\./, "Utilizas magia primigenia. Puedes lanzar flora enmarañante y resiliencia de roble (uno de cada) como conjuros innatos primigenios de 2.º rango una vez al día."],
            [/You have a keepsake that grants you luck\. You gain a \+1 circumstance bonus to saves against spells and magical effects at all times, not just when you use Leshy Superstition\. If you lose the keepsake, you lose the bonus until you designate a new keepsake, typically over the course of a week\./, "Tienes un recuerdo que te otorga suerte. Obtienes un bonificador +1 por circunstancia a las salvaciones contra conjuros y efectos mágicos en todo momento, no tan solo cuando utilizas Superstición de leshy. Si pierdes el recuerdo, pierdes el bonificador hasta que designas un nuevo recuerdo, por lo general en el transcurso de una semana."],
            [/If you rest outdoors for 10 minutes during the day, you regain Hit Points equal to your Constitution modifier × half your level\. You gain this benefit in addition to any healing from Treat Wounds\. Leshies whose plant nourishment does not rely on photosynthesis require a similarly suitable environment\. For example, fungus leshies need dark, damp environments and a pile of decaying plant matter\./, "Si descansas al aire libre durante 10 minutos durante el día, recuperas tantos Puntos de Golpe como tu modificador por Constitución multiplicado por la mitad de tu nivel. Obtienes este beneficio además de cualquier curación debida a Tratar heridas. Los leshys cuya nutrición vegetal no se basa en la fotosíntesis requieren un ambiente similarmente adecuado. Por ejemplo, los leshys de los hongos necesitan entornos oscuros y húmedos y cierta cantidad de materia vegetal en descomposición."],
            [/When your seedpods strike a felling blow, they burst into viciously thorny vines\. When you critically succeed at a seedpod Strike, vines twist and stab your foe, dealing 1d4 persistent piercing damage\./, "Cuando tus tegumentos asestan un golpe derribador, explotan en zarcillos cruelmente espinados. Cuando obtienes un éxito crítico en un Golpe de tegumento, los zarcillos se retuercen y se clavan en tu enemigo, infligiéndole 1d4 daño perforante persistente."],
            [/You can call forth nearby nature spirits to augment your body\. Once per day, you can cast plant form as a 5th-rank primal innate spell\. When you reach 17th level, you can heighten the spell to 6th rank when you cast it\./, "Puedes convocar a los espíritus de la Naturaleza cercanos para que potencien tu cuerpo. Una vez al día puedes lanzar forma de planta como conjuro innato primigenio de 5.º rango. Cuando llegues a 17.º nivel, podrás potenciar el conjuro a 6.º rango cuando lo lances."],
            [/You can call upon the vital essence of your spirit to restore life to your allies and call forth vines to ensnare and bludgeon your foes\. You can cast field of life and tangling creepers as 6th-rank primal innate spells once per day each\./, "Llamas a la esencia vital de tu espíritu para que restablezca la vida a tus aliados y convocas zarcillos para enmarañar y golpear a tus enemigos. Puedes lanzar campo de vida y enredaderas enmarñantes (uno de cada) como conjuros innatos primigenios de 6.º rango una vez al día."],
            [/Your command over your vital essence allows you or an ally to recover from grievous wounds\. You can cast regenerate as a 7th-rank primal innate spell once per day\./, "Tu dominio sobre tu esencia vital te permite a ti o a un aliado recuperarte de heridas graves. Una vez al día puedes lanzar regenerar como conjuro innato primigenio de 7.º rango."],
            [/You are adept at disguising coded messages as folksy idioms\. Using slang, jokes, halfling loanwords, and the like, you convey a simple message consisting of three basic words \(such as “Danger assassin flee” or “Meet me moonrise”\)\. Your intended listener can attempt a DC 20 Perception check to discern the message\. This DC is reduced by 5 if the listener is a halfling or has Folksy Patter, or by 10 if both apply\. Eavesdroppers can also attempt a Perception check against your Deception DC to discern your meaning\. Any bonuses or penalties to Perception checks to Sense Motive apply to checks to understand Folksy Patter\./, "Eres un adepto en disfrazar mensajes codificados como expresiones rústicas. Utilizando argot, chistes, extranjerismos y cosas parecidas, transmites un mensaje sencillo que consiste en tres palabras básicas (como por ejemplo \"Peligro asesino huye\" o bien \"Reúnete conmigo anochecer\"). Quien te escucha tiene derecho a una prueba de Percepción CD 20 para discernir el mensaje. Dicha CD se reduce en 5 si quien escucha es un mediano o si también dispone de Cháchara rústica, o en 10 si ambas cosas se cumplen. Si alguien escucha a escondidas puede también hacer una prueba de Percepción contra tu CD de Engaño para discernir el significado. Cualquier bonificador o penalizador a las pruebas de Percepción para Averiguar intenciones se aplica a las pruebas para entender la Cháchara rústica."],
            [/You favor traditional halfling weapons, so you've learned how to use them more effectively\. You gain access to all uncommon weapons with the halfling trait\. You have familiarity with weapons with the halfling trait plus the sling and shortsword -  for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\./, "Te gustan las armas tradicionales de los medianos, por lo que has aprendido a usarlas de forma más eficaz. Obtienes acceso a todas las armas poco comunes con el rasgo mediano. Tienes familiaridad con las armas que tienen el rasgo mediano además de la honda y la espada corta; a efectos de competencia, tratas cualquier arma marcial de éstas como una arma sencilla y cualquier arma avanzada de éstas como una arma marcial."],
            [/You grew up riding your clan's shaggy ponies and riding dogs\. You become trained in Nature\. If you would automatically become trained in Nature \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also get a \+1 circumstance bonus to Command an Animal if the target is a traditional halfling mount, such as a pony or riding dog\./, "Creciste montando los peludos ponis y los perros de monta de tu clan. Obtienes el rango entrenado en Naturaleza. Si estás automáticamente entrenado en Naturaleza (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. Obtienes también un bonificador +1 por circunstancia a Comandar un animal si el objetivo es una montura tradicional de los medianos como un poni o un perro de monta."],
            [/You were either pressed into indentured servitude or shackled in a prison, but you've since escaped and have trained to ensure you'll never be caught again\. Whenever you roll a success on a check to Escape or a saving throw against an effect that would impose the grabbed, immobilized, or restrained condition on you, you get a critical success instead\. Whenever a creature rolls a failure on a check to Grapple you, it gets a critical failure instead\./, "Te viste obligado a la servidumbre, o bien por deudas, o bien encadenado en una prisión, pero luego escapaste y te has entrenado para estar seguro de que jamás te volverán a atrapar. Siempre que consigues un éxito en una prueba de Huir o una tirada de salvación contra un efecto que te impondría el estado agarrado, inmovilizado o neutralizado, en su lugar obtienes un éxito crítico. Siempre que una criatura sufre un fallo en una prueba para Apresarte, en su lugar sufre un fallo crítico."],
            [/You pay close attention to the people around you, allowing you to more easily notice when they act out of character\. You gain a \+2 circumstance bonus to Perception checks when using the Sense Motive basic action to notice enchanted or possessed characters\. If you aren't actively using Sense Motive on an enchanted or possessed character, the GM rolls a secret check, without your usual circumstance bonus, for you to potentially notice the enchantment or possession anyway\. In addition to using it for skill checks, you can use the Aid basic action to grant a bonus to another creature's saving throw or other check to overcome enchantment or possession\. As usual for Aid, you need to prepare by using an action on your turn to encourage the creature to fight against the effect/, "Prestas mucha atención a la gente que te rodea, lo que te permite notar más fácilmente que alguien actúa de forma impropia. Obtienes un bonificador +2 por circunstancia a las pruebas de Percepción al utilizar la acción básica Averiguar intenciones para detectar personajes encantados o poseídos. Si no estás utilizando activamente Averiguar intenciones sobre un personaje encantado o poseído, el DJ hace una tirada secreta, sin tu bonificador habitual por circunstancia, para que puedas darte cuenta potencialmente del encantamiento o posesión. Además de utilizarla para las pruebas de habilidad, puedes utilizar la acción básica Prestar ayuda para conceder un bonificador a la tirada de salvación de otra criatura u otra prueba para superar el encantamiento o la posesión. Como es habitual en Prestar ayuda, tienes que preparar una acción en tu turno para animar a la criatura a luchar contra el efecto."],
            [/Whether keeping your balance or climbing, your feet easily find purchase\. If you roll a success on an Acrobatics check to Balance or an Athletics check to Climb, you get a critical success instead\. You're not off-guard when you attempt to Balance or Climb\./, "Ya se trate de mantener el equilibrio o de trepar, tus pies se agarran fácilmente al terreno. Si obtienes un éxito en una prueba de Acrobacias para Mantener el equilibrio o de Atletismo para Trepar, en su lugar obtienes un éxito crítico. No estás desprevenido cuando tratas de Mantener el equilibrio o Trepar."],
            [/You've dutifully learned how to keep your balance and how to stick to the shadows where it's safe, important skills passed down through generations of halfling tradition\. You gain the trained proficiency rank in Acrobatics and Stealth\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Additional Lore general feat for Halfling Lore\./, "Has aprendido obedientemente a mantener el equilibrio y a quedarte en las sombras donde se está seguro, importantes habilidades transmitidas a lo largo de las generaciones en la tradición de los medianos. Obtienes el rango de competencia entrenado en Acrobacias y en Sigilo. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes la dote general Saber adicional para Saber (medianos)."],
            [/You have learned to remain hidden by using larger folk as a distraction to avoid drawing attention to yourself\. You can use creatures that are at least one size larger than you \(usually Medium or larger\) as cover for the Hide and Sneak actions, though you still can't use such creatures as cover for other uses, such as the Take Cover action\./, "Has aprendido a permanecer oculto usando a la gente grande como distracción, y así no atraer la atención hacia ti. Puedes utilizar criaturas por lo menos una categoría de tamaño mayores que tú (normalmente Medianas o mayores) como cobertura para las acciones Esconderse y Movimiento furtivo, aunque sigues sin poder utilizar a dichas criaturas como cobertura para otros usos, como por ejemplo para la acción Ponerse a cubierto."],
            [/Your happy-go-lucky nature makes it seem like misfortune avoids you, and to an extent, that might even be true\. You can reroll the triggering check, but you must use the new result, even if it's worse\./, "Tu naturaleza despreocupada hace que parezca que la desventura te evita y, hasta cierto punto, incluso podría ser verdad. Puedes repetir la tirada desencadenante, pero te tienes que quedar con el nuevo resultado, incluso si es peor."],
            [/You have learned how to use your sling to fell enormous creatures\. When you hit on an attack with a weapon of the sling group against a Large or larger creature, increase the size of the weapon damage die by one step\./, "Has aprendido a utilizar la honda para abatir criaturas enormes. Cuando aciertas con un ataque de una arma del grupo de las hondas contra una criatura Grande o mayor, incrementa en un paso el tamaño del dado de daño."],
            [/During your adventures, you've honed your ability to adapt to the culture of the predominant ancestry around you\. You gain the Adopted Ancestry general feat, and you also gain one 1st-level ancestry feat from the ancestry you chose for the Adopted Ancestry feat\./, "Durante tus aventuras, has refinado tu capacidad para adaptarte a la cultura de la ascendencia predominante de quienes te rodean. Obtienes la dote general Ascendencia adoptada y también una dote de ascendencia de 1.er nivel de la ascendencia elegida para Ascendencia adoptada."],
            [/You are an expert at avoiding the lumbering footsteps of larger creatures\. You Step to another space adjacent to the enemy\./, "Eres experto en evitar las torpes pisadas de las criaturas más grandes. Das un Paso a otro espacio adyacente al enemigo."],
            [/You dart under the legs of your enemies in combat\. You can end a successful Tumble Through action in a Large or larger enemy's space\. Also, when using the Step Lively feat, you can Step into the triggering enemy's space\. The enemy must have limbs or otherwise leave you enough room for this maneuver, as determined by the GM\. For instance, you could share space with a giant or dragon, but not an ooze\./, "En combate, corres bajo las piernas de tus enemigos. Puedes acabar una acción con éxito de Pasar haciendo acrobacias en el espacio de un enemigo Grande o mayor. También, cuando utilizas la dote Pisada vivaz, puedes entrar de un Paso en el espacio del enemigo desencadenante. Dicho enemigo debe tener extremidades o por lo demás dejar sitio suficiente para dicha maniobra, a determinar por el DJ. Por ejemplo, podrías compartir espacio con un gigante o con un dragón, pero no con un cieno."],
            [/You are easily able to ward off attempts to play on your fears and emotions\. When you roll a success on a saving throw against an emotion effect, you get a critical success instead\. If your heritage is gutsy halfling, when you roll a critical failure on a saving throw against an emotion effect, you get a failure instead\./, "Eres fácilmente capaz de sortear cualquier intento de otros de aprovecharse de tus miedos y de tus emociones. Cuando obtienes un éxito en una tirada de salvación contra un efecto de emoción, en su lugar obtienes un éxito crítico. Si tu herencia es mediano con agallas, cuando sufres un fallo crítico en una tirada de salvación contra un efecto de emoción, en su lugar sufres un fallo."],
            [/You won't allow others to restrain you\. You can cast unfettered movement on yourself as a primal innate spell once per day\./, "No permites que otros te retengan. Puedes lanzar sobre ti mismo movimiento sin restricciones como conjuro innato primigenio una vez al día."],
            [/Your luck guides you to look the right way and aim your blows unerringly\. You can use Halfling Luck twice per day: once in response to its normal trigger, and once when you fail a Perception check or attack roll instead of the normal trigger\./, "Tu suerte te guía para buscar el lugar correcto y apunta tus Golpes de forma infalible. Puedes utilizar Suerte del mediano dos veces al día: una en respuesta a su desencadenante habitual, y otra cuando fallas una prueba de Percepción o tirada de ataque en lugar del desencadenante normal."],
            [/While sharing a creature's space using Dance Underfoot, your melee weapons and unarmed attacks gain the trip trait, but only against the creature whose space you share\. You can be in the same space as a Large or larger prone creature, even if it's not your ally\./, "Mientras compartes el espacio de una criatura utilizando Bailar bajo los pies, tus armas cuerpo a cuerpo y tus ataques sin armas obtienen el rasgo derribo, pero sólo contra la criatura cuyo espacio compartes. Puedes estar en el mismo espacio que una criatura Grande o mayor que está tumbada, incluso si no es aliada tuya."],
            [/You excel at going unnoticed, especially among a crowd\. You no longer need to have cover or be concealed to Hide or Sneak\. If you would have lesser cover from a creature, you gain standard cover instead and can Take Cover; if you would have standard cover from a creature, you gain greater cover instead\./, "Eres excelente en pasar desapercibido, especialmente en una multitud. Ya no necesitas disponer de cobertura o estar oculto para Esconderte o utilizar Movimiento furtivo. Si dispondrías de cobertura menor debido a una criatura, en su lugar obtienes cobertura normal y puedes Ponerte a cubierto; si dispondrías de cobertura normal debido a una criatura, en su lugar obtienes cobertura mayor."],
            [/You slip from your adversaries' notice and appear to be somewhere else\. You become invisible for 1 minute or until you take a hostile action, whichever comes first\. Choose a location within 10 feet of you\. Until your invisibility ends, you appear to be hidden in that location to anyone trying to find you\. If the searcher gets clear evidence that you're not there, they no longer think you're hidden there, but they don't discover your actual location\./, "Desapareces de la atención de los adversarios y pareces estar en algún otro lugar. Te vuelves invisible durante 1 minuto o hasta que llevas a cabo una acción hostil, lo que primero sucede. Elige una ubicación a 10 pies (3 m) o menos de ti. Hasta que tu invisibilidad acaba, pareces estar escondido en dicha ubicación para cualquiera que pretende encontrarte. Si quien busca obtiene pruebas claras de que no estás allí, ya no piensa que lo estás, pero no descubre tu ubicación actual."],
            [/You have an impressive innate ability to tame and command ferocious beasts\. You become trained in the Nature skill and gain your choice of the Pet general feat or the Train Animal skill feat\./, "Tienes una sorprendente capacidad innata para domar y dominar bestias feroces. Obtienes el rango entrenado en la habilidad Naturaleza y puedes elegir entre la dote general Mascota y la dote de habilidad Adiestrar animal."],
            [/You have particularly long, jagged tusks perfect for tearing meat from bone\. You gain a tusks unarmed attack that deals 1d6 piercing damage\. Your tusks are in the brawling group and have the finesse and unarmed traits\./, "Tienes unos colmillos particularmente largos e irregulares, perfectos para arrancar la carne de los huesos. Obtienes un ataque sin arma de colmillo que inflige 1d6 daño perforante. Tus colmillos están en el grupo pelea y tienen los rasgos sutileza y sin armas."],
            [/In combat, you favor the brutal weapons that are traditional for your orc ancestors\. You gain access to all uncommon weapons with the orc trait\. You have familiarity with weapons with the orc trait plus the falchion and greataxe - for the purposes of proficiency, you treat any of these that are martial weapons as simple weapons and any that are advanced weapons as martial weapons\./, "En combate, prefieres las armas brutales que eran tradición para tus antepasados orcos. Obtienes acceso a todas las armas poco comunes con el rasgo orco. Tienes familiaridad con las armas que tienen el rasgo orco, además del alfanje y de la gran hacha; a efectos de competencia, de ellas tratas cualesquiera armas marciales como armas sencillas y cualesquiera armas avanzadas como armas marciales."],
            [/Fierceness in battle runs through your blood, and you refuse to fall from your injuries no matter how terrible they may be\. You avoid being knocked out and remain at 1 Hit Point, and your wounded condition increases by 1\./, "La ferocidad en la batalla corre por tu sangre y te niegas a desplomarte debido a tus heridas, por terribles que sean. Evitas quedar inconsciente y permaneces a 1 punto de Golpe, mientras que tu estado herido se incrementa en 1."],
            [/You bear scars or tattoos enhanced by the mark of your community's prowess\. When you select this feat, choose one of the options from the below table\. You are trained in the listed skill and gain a \+1 status bonus to saves against spells from the listed tradition\. You gain a large brand or tattoo in the shape of the chosen emblem or a similar concept \(for example, the Burning Sun could be a torch, sun, volcano, or other fiery symbol, while the Empty Hand could be a fist or claw\)\./, "Luces cicatrices o tatuajes realzados por la marca de coraje de tu clan. Cuando seleccionas esta dote, elige una de las opciones de la tabla que viene a continuación. Estás entrenado en la habilidad indicada y obtienes un bonificador +1 por estatus a las salvaciones contra los conjuros de la tradición también indicada. Obtienes una gran marca o tatuaje en forma de emblema elegido o un concepto similar (por ejemplo, el Sol ardiente podría ser una antorcha, el sol, un volcán u otro símbolo flamígero, mientras que la Mano vacía podría ser un puño o una zarpa)."],
            [/Select a Hold Mark/, "Selecciona una marca del clan"],
            [/You are trained in the listed skill and gain a \+1 status bonus to saves against spells from the listed tradition\./, "Estás entrenado en la habilidad indicada y obtienes un bonificador +1 por estatus a las salvaciones contra los conjuros de la tradición también indicada."],
            [/Your fists have been forged by battle, your naturally tough skin and dense bone further hardened by conflict. Your fist unarmed attacks no longer have the nonlethal trait and gain the shove weapon trait./, "Tus puños se han forjado en la batalla y tu piel naturalmente dura y tus densos huesos se han endurecido aún más debido al conflicto. Tus ataques sin armas con el puño ya no tienen el rasgo no letal y obtienen el rasgo de arma empujón."],
            [/The hold elders taught you your people's histories, told tales of great athletic feats, and shared with you the hardships your ancestors endured so that you can pass this wisdom down to future generations\. You become trained in Athletics and Survival\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\./, "Los ancianos del clan te enseñaron la historia de tu pueblo, te contaron las grandes hazañas atléticas y compartieron contigo las dificultades que soportaron tus antepasados para que pudieras transmitir esta sabiduría a las generaciones futuras. Obtienes el rango entrenado en Atletismo y Supervivencia. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección."],
            [/You also gain the Additional Lore general feat for Orc Lore\./, "Obtienes también la dote general Saber adicional para Saber (orcos)."],
            [/You defend yourself against magic by relying on techniques derived from orc cultural superstitions\. You gain a \+1 circumstance bonus to your saving throw against the triggering spell or magical effect\./, "Te defiendes contra la magia basándote en técnicas derivadas de las supersticiones culturales de los orcos. Obtienes un bonificador +1 por circunstancia a tu tirada de salvación contra el conjuro o efecto mágico desencadenante."],
            [/You're exceptionally difficult to kill\. The DC of your recovery checks is equal to 9 \+ your dying value, or 8 \+ your dying value if you have the Toughness general feat\. In addition, whenever someone returns you to life using magic that would normally leave you debilitated for a week \(such as raise dead or the resurrect ritual\), you don't suffer that condition\./, "Eres excepcionalmente difícil de matar. La CD de tus pruebas de recuperación es igual a 9 + tu valor de moribundo, o bien 8 + tu valor de moribundo si dispones de la dote general Dureza. Además, siempre que alguien te devuelve a la vida utilizando magia que normalmente te dejaría debilitado durante una semana (como por ejemplo revivir a los muertos o el ritual resucitar), no sufres dicho estado."],
            [/Your lethal unarmed attacks leave bloody gouges or cause severe internal bleeding\. When you critically hit with a Strike using an unarmed attack that isn't nonlethal, the target takes 1d4 persistent bleed damage\. This can be because you're taking the penalty to use a fist for a lethal attack or because you have an unarmed attack without the nonlethal trait due to Tusks or a similar ability\./, "Tus ataques letales sin armas dejan magulladuras ensangrentadas o provocan graves hemorragias internas. Cuando obtienes un impacto crítico con un Golpe utilizando un ataque sin armas que no es no letal, el objetivo sufre 1d4 daño persistente por sangrado. Esto puede deberse a que se te impone el penalizador debido a utilizar un puño para un ataque letal o porque dispones de un ataque sin armas que carece del rasgo no letal debido a Colmillos o una aptitud similar."],
            [/Glorious, storied scars cover and protect much of your body, girding you in fleshly armor that resists any wound weaker than those you have already survived\. Your DC on flat checks to end persistent bleed damage is reduced from 15 to 10, or from 10 to 5 after receiving especially appropriate assistance\./, "Unas cicatrices gloriosas e historiadas cubren y protegen gran parte de tu cuerpo, envolviéndote en una armadura de carne que resiste cualquier herida más débil que aquellas a las que ya has sobrevivido. Tu CD para las pruebas planas con el fin de acabar con el daño persistente por sangrado se reduce de 15 a 10, o de 10 a 5 tras recibir una asistencia especialmente apropiada."],
            [/Surviving in hostile terrain has given you a great talent for mobility\. Whenever you roll a success on an Athletics check to Climb or Swim, you get a critical success instead\./, "Sobrevivir en terrenos hostiles te ha proporcionado un gran talento para la movilidad. Siempre que obtienes un éxito en una prueba de Atletismo para Trepar o Nadar, en su lugar obtienes un éxito crítico."],
            [/You resist death's clutches with supernatural vigor, daring death to claim you while promising that any such attempt will surely fail\. When you use Orc Ferocity, you gain temporary Hit Points equal to your level\./, "Te resistes a las garras de la muerte con un vigor sobrenatural, desafiando a la muerte a que te reclame, a la vez que prometes que todo intento a tal efecto fracasará. Cuando utilizas Ferocidad de orco, obtienes tantos Puntos de Golpe temporales como tu nivel."],
            [/You steep yourself in superstition and practice ancient orc mental exercises for shrugging off the effects of magic\. You gain a \+1 circumstance bonus to saving throws against spells and magical effects at all times\./, "Te infundes de superstición y practicas antiguos ejercicios mentales de los orcos para desprenderte de los efectos de la magia. Obtienes en todo momento un bonificador +1 por circunstancia a las tiradas de salvación contra los conjuros y los efectos mágicos."],
            [/Since ancient times, the mightiest orc beast tamers would draw out the true fighting spirit of their companion beasts by feeding the creatures a draft incorporating the orc's own blood\. All animal companions, pets, familiars, and bonded animals you have gain the Orc Ferocity feat, and gain one reaction per round they can use only for Orc Ferocity\. If you have the Undying Ferocity ancestry feat, all animal companions, pets, familiars, and bonded animals you have also gain the benefits of that feat when using the Orc Ferocity reaction\./, "Desde los tiempos antiguos, los domadores de bestias orcos más poderosos sacaban el verdadero espíritu de lucha de sus bestias compañeras, alimentando a las criaturas con una mezcla que incorporaba la propia sangre del orco. Todos los compañeros animales, mascotas, familiares y animales vinculados de que dispones obtienen la dote Ferocidad de orco y obtienen una reacción por asalto que pueden utilizar tan solo para Ferocidad de orco. Si tienes la dote de ascendencia Ferocidad inmortal, todos los compañeros animales, mascotas, familiares y animales vinculados de que dispones obtienen también los beneficios de dicha dote utilizando la reacción Ferocidad de orco."],
            [/You don't just resist magic; you devour it\. Whenever you succeed at a saving throw against a spell or magical effect, you gain temporary Hit Points equal to double the spell's rank, or equal to the level if the magical effect isn't a spell\. These temporary Hit Points last until the end of your next turn\./, "No tan solo resistes la magia, sino que la devoras. Siempre que tienes éxito en una tirada de salvación contra un conjuro o un efecto mágico, obtienes tantos Puntos de Golpe temporales como el doble del rango de conjuro, o bien como el nivel, si el efecto mágico no es un conjuro. Dichos Puntos de Golpe temporales duran hasta el final de tu siguiente turno."],
            [/Given time to collect yourself after a near-death scrape, you can rebuild your ferocity and withstand additional finishing blows\. You can use Orc Ferocity with a frequency of once per hour, rather than once per day\./, "Si tienes tiempo para recomponerte tras un escarceo con la muerte, puedes reconstruir tu ferocidad y resistir golpes finales adicionales. Puedes utilizar Ferocidad de orco con una frecuencia de una vez por hora, en lugar de una vez al día."],
            [/You lash out viciously even as you fend off death\. Make a single melee Strike\. If this Strike brings a foe to 0 Hit Points, this activation of Orc Ferocity doesn't count against its frequency\./, "Atacas con saña incluso cuando esquivas la muerte. Da un solo Golpe cuerpo a cuerpo. Si dicho Golpe lleva a 0 Puntos de Golpe a un enemigo, esta activación de Ferocidad de orco no cuenta contra su frecuencia."],
            [/At 5th level, whenever you get a critical hit with one of these weapons, you get its critical specialization effect\./, "A 5.º nivel, siempre que obtienes un impacto crítico con una de estas armas, obtienes su efecto de especialización crítica."],
            [/You are among the most common of changelings - those born to sweet hags - and a vibrant green eye signifies that parentage\. Your mother's manipulative nature and versatile voice gives you an edge when deceiving others\. You gain the Charming Liar skill feat\. If you roll Deception for initiative, foes in that combat encounter that haven't acted yet are off-guard against you\./, "Eres uno de los changelings más comunes, los nacidos de una saga dulce, y un ojo verde brillante indica dicho parentesco. La naturaleza manipuladora de tu madre y su versátil voz te conceden ventaja a la hora de engañar a los demás. Obtienes la dote de habilidad Mentiroso encantador. Si tiras Engaño para la iniciativa, los enemigos de dicho encuentro de combate que aún no han actuado están desprevenidos ante ti."],
            [/Your mother was an iron hag known for physical prowess, and you have one violet or steel-gray eye\. You have thick, sturdy claws made of cold iron that grow naturally from your body\. You gain a claw unarmed attack that deals 1d6 slashing damage\. Your claws are in the brawling group, have the unarmed and grapple traits, and are cold iron\./, "Tu madre era una saga de hierro conocida por su poderío físico, y tú tienes un ojo color violeta o gris metálico. Dispones de unas garras gruesas y recias hechas de hierro frío, que te crecen de forma natural. Obtienes un ataque sin armas de garra que inflige 1d6 daño cortante. Tus garras pertenecen al grupo pelea, tienen los rasgos sin armas y presa y son de hierro frío."],
            [/You are the child of a cuckoo hag, making one of your eyes violet or even black\. Your mother's powers over sleep and dreams have given you a degree of resistance to those effects, granting you a \+2 circumstance bonus to all saving throws against sleep effects and effects that cause or alter dreams\./, "Eres hijo de una saga chiflada, lo que hace que uno de tus ojos sea violeta o incluso negro. Los poderes de tu madre sobre el sueño y los sueños te han concedido cierto grado de resistencia a dichos efectos, obteniendo un bonificador +2 por circunstancia a todas las tiradas de salvación contra los efectos de sueño y los efectos que causan o alteran los sueños."],
            [/In addition, sleep is more restorative for you\. You regain HP equal to your Constitution modifier × double your level \(instead of just × your level\), and you reduce any drained and doomed conditions you have by 2 instead of by 1\./, "Además, dormir resulta para ti más reparador. Recuperas tantos PG como tu modificador por Constitución multiplicado por el doble de tu nivel (en lugar de tan sólo multiplicado por tu nivel) y reduces en 2 en lugar de 1 cualquier estado propio de drenado y condenado."],
            [/Your mother was a sea hag, granting you one sea-green or blue eye\. You find comfort both in the sea and on the shore\. Whenever you roll a success on an Athletics check to Swim, you get a critical success instead\. If you end your turn in water without having succeeded at a Swim action that round, you don't sink \(but you might still be moved by the current\)\./, "Tu madre era una saga marina, lo que te otorga un ojo verde o azul marino. Te sientes cómodo tanto en el mar como en la costa. Siempre que tienes éxito en una prueba de Atletismo para Nadar, obtienes en su lugar un éxito crítico. Si acabas tu turno en el agua sin haber tenido éxito en una acción de Nadar en este asalto, no te hundes (pero igualmente te podría arrastrar la corriente)."],
            [/When you came of age, your fingernails grew long and sharp\. You gain a claw unarmed attack that deals 1d4 slashing damage\. Your claws are in the brawling group and have the agile, finesse, and unarmed traits\./, "Cuando alcanzaste la mayoría de edad, las uñas empezaron a crecerte largas y afiladas. Obtienes un ataque sin armas de garra que inflige 1d4 daño cortante. Tus garras pertenecen al grupo pelea y tienen los rasgos ágil, sutileza y sin armas."],
            [/All too aware of your true nature, you've studied hags and their powers\. You gain the trained proficiency rank in Deception and Occultism\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\./, "Muy consciente de tu verdadera naturaleza, has estudiado a las sagas y sus poderes. Obtienes el rango de competencia entrenado en Engaño y Ocultismo. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección."],
            [/You also gain the Additional Lore general feat for Hag Lore\./, "También obtienes la dote general Saber adicional para Saber (sagas)."],
            [/You've nurtured the supernatural abilities gifted by your hag mother, particularly your sight\. You gain darkvision\./, "Has nutrido las aptitudes sobrenaturales concedidas por tu madre saga, particularmente la vista. Obtienes visión en la oscuridad."],
            [/You've heard the Call, and by resisting it, you've developed a bulwark against effects that target your mind\. You gain a \+1 circumstance bonus to Will saving throws against mental effects\. If you roll a success on your saving throw against a mental effect that would make you controlled, you get a critical success instead\./, "Has oído la Llamada, y al resistirte constantemente a ella has alzado un baluarte contra los efectos que tienen tu mente como objetivo. Obtienes un bonificador +1 por circunstancia a las salvaciones de Voluntad contra los efectos mentales. Si obtienes un éxito en tu tirada de salvación contra un efecto mental que te haría estar controlado, en su lugar obtienes un éxito crítico."],
            [/You blend in with unnatural subtlety\. When you are concealed or hidden, increase the DC of the flat check to target you to 6 if you're concealed or 12 if you're hidden\./, "Te camuflas con una sutileza antinatural. Cuando estás oculto o escondido, incrementa a 6 la CD de la prueba plana para designarte como objetivo si estás oculto o a 12 si estás escondido."],
            [/Your claws carry your mother's hag magic\. When you critically hit with a claw Strike, the target takes an additional 1d4 persistent mental damage\./, "Tus garras portan la magia de tu madre saga. Cuando obtienes un impacto crítico con un Golpe de garra, el objetivo sufre 1d4 daño mental persistente adicional."],
            [/Your study of occult practices has shown you how to best defend against them\. You gain a \+1 circumstance bonus to all saving throws against occult effects\./, "Tu estudio de las prácticas ocultistas te ha mostrado cómo defenderte mejor contra ellas. Obtienes un bonificador +1 por circunstancia a todas las tiradas de salvación contra los efectos ocultistas."],
            [/Through your heritage, you can replicate a hag's magic\. Choose one common spell of 4th rank or lower from those available to a coven, including the spells contributed to a coven by a hag of your mother's type\. You can cast this spell once per day as a 4th-rank occult innate spell\./, "Gracias a tu herencia, puedes replicar parte de la magia de una saga. Elige un conjuro común de 4.º rango o inferior de los disponibles para un aquelarre, incluidos los aportados al mismo por una saga del tipo de tu madre. Puedes lanzar ese conjuro una vez al día como un conjuro innato ocultista de 4.º rango."],
            [/Spells available to all covens are augury, charm, clairaudience, clairvoyance, dream message, and illusory disguise\. The eligible spells granted by the most prominent types of hag are/, "Los conjuros disponibles para todos los aquelarres son augurio, clariaudiencia, clarividencia, disfraz ilusorio, hechizar y mensaje onírico. Los conjuros elegibles concedidos por los tipos de saga más prominentes son"],
            [/You descend from an angel, a winged messenger from Nirvana or one of the other celestial realms\. You gain the trained proficiency rank in Society\. If you would automatically become trained in Society \(from your background or class, for example\), you instead become trained in a skill of your choice\. You know the Empyrean language, and you gain the Multilingual skill feat\./, "Desciendes de un ángel, un mensajero alado del Nirvana o de uno de los otros reinos celestiales. Obtienes el rango de competencia entrenado en Sociedad. Si ya estás entrenado en Sociedad (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. Conoces el idioma empíreo y obtienes la dote de habilidad Multilingüe."],
            [/Your lineage traces back to a daemon, one of the manifestations of horrific forms of death that devour souls within their foul home of Abaddon\. As a result, you cling tenaciously to the last shreds of your own life force\. You gain the Diehard general feat\./, "Tu linaje desciende de un daimonion, una de las manifestaciones de formas horribles de muerte que devoran las almas en su vil hogar de Abaddon. Como resultado, te aferras tenazmente a las últimas briznas de tu propia fuerza vital. Obtienes la dote general Duro de pelar."],
            [/You trace your lineage to archons, guardians of the seventiered mountain of Heaven and nurturers of law and virtue within mortals\. You gain a \+1 circumstance bonus to saves against emotion effects, and if you roll a success on a save against an emotion effect, you get a critical success instead\./, "Tu linaje se remonta a los arcontes, guardianes de la montaña de siete niveles del Cielo y cuidadores de la ley y de la virtud en los mortales. Obtienes un bonificador +1 por circunstancia a las salvaciones contra los efectos de emoción y, si obtienes un éxito en una salvación contra un efecto de emoción, en su lugar obtienes un éxito crítico."],
            [/Your blood bears the mark of a demon, a living embodiment of sin from the fetid depths of the Outer Rifts\. Demonic power pulses through your veins and manifests in a different way for each pitborn, whether you have webbed fingers and thrive in the water, large hands capable of wrestling larger foes, or some other manifestation\. You are trained in Athletics\. If you were already trained in Athletics \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain any one common 1st-level skill feat with a prerequisite of trained in Athletics, as reflects the manifestation of your fiendish blood\./, "Tu sangre lleva la marca de un demonio, una encarnación viva del pecado que proviene de las fétidas profundidades de las Fisuras Exteriores. El poder demoníaco corre por tus venas y se manifiesta de forma diferente en cada nacido del foso: podrías tener los dedos palmeados y desenvolverte en el agua, grandes manos capaces de luchar contra enemigos más grandes o alguna otra manifestación. Obtienes el rango entrenado en Atletismo. Si ya estás entrenado en Atletismo (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes una dote de habilidad cualquiera de 1.er nivel con el prerrequisito de disponer del rango entrenado en Atletismo, como refleja la manifestación de tu sangre infernal."],
            [/Your lineage descends from devils, conniving schemers of Hell\. You're as skilled at noticing lies and twisted wordings as you are at constructing them\. You are trained in Deception and Legal Lore\. If you were already trained in Deception \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Lie to Me skill feat\./, "Tu linaje desciende de los diablos, los conspiradores de la malévola jerarquía del Infierno. Eres tan hábil en percibir las mentiras y las palabras retorcidas como en construirlas. Estás entrenado en Engaño y en Saber (legal). Si ya estás entrenado en Engaño (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes la dote de habilidad Miénteme."],
            [/Your blood sings with the liberating power of the azatas, living embodiments of freedom from the wild realm of Elysium\. You gain a \+1 circumstance bonus to Escape\. When you roll a critical failure on a check to Escape, you get a failure instead, and when you roll a success, you get a critical success instead\./, "Tu sangre resuena con el poder liberador de los azatas, encarnaciones vivas de la libertad del reino salvaje del Elíseo. Obtienes un bonificador +1 por circunstancia a Huir. Cuando sufres un fallo crítico en una prueba de Huir, en su lugar sufres un fallo, y cuando obtienes un éxito, en su lugar obtienes un éxito crítico."],
            [/You have a halo of light and goodness that sheds light with the effects of a divine light cantrip\. A cantrip is heightened to a spell rank equal to half your level rounded up\. You can Sustain to suppress or reestablish the halo\./, "Te rodea un halo de luz y de bondad que ilumina con los efectos de un truco divino de luz. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba. Puedes Mantener para suprimir o restablecer el halo."],
            [/Part of your body has an animalistic influence from a planar creature\. Your hands end in claws, you have hooves instead of feet, sharp teeth fill your mouth, or a tail extends from your spine\. You gain your choice of one of the following unarmed attacks\. The attack is in the brawling group and has the listed damage die and traits\./, "Parte de tu cuerpo tiene una influencia animalística debida a una criatura planaria. Tus manos acaban en garras, tienes pezuñas en lugar de pies, afilados dientes llenan tu boca o una cola se extiende de tu espina dorsal. Obtienes uno de los siguientes ataques sin armas a tu elección. Dicho ataque pertenece al grupo pelea y tiene los dados de daño y los rasgos indicados."],
            [/Tail 1d4 bludgeoning \(agile, finesse, unarmed\)/, "Cola 1d4 contundente (ágil, sutileza, sin armas)"],
            [/Claw 1d4 slashing \(agile, finesse, unarmed, versatile piercing\)/, "Garra 1d4 cortante (ágil, sutileza, sin armas, versátil Per)"],
            [/Jaws 1d6 piercing \(finesse, unarmed\)/, "Mandíbulas 1d6 perforante (sutileza, sin armas)"],
            [/Hoof 1d6 bludgeoning \(finesse, unarmed\)/, "Pezuña 1d6 contundente (sutileza, sin armas)"],
            [/Your eyes can see through darkness with visual acuity akin to that possessed by most extraplanar beings\. You gain darkvision\./, "Tus ojos pueden ver a través de la oscuridad con una agudeza visual parecida a la de la mayoría de seres extraplanarios. Obtienes visión en la oscuridad."],
            [/You possess hooves, ankle wings, or some other feature that hastens your movement\. Your Speed increases by 5 feet\./, "Dispones de pezuñas, alas en los tobillos o cualquier otro rasgo que acelera tu movimiento. Tu Velocidad se incrementa en 5 pies (1,5 m)."],
            [/You know the secrets of the Multiverse\. You gain the trained proficiency rank in either Diplomacy or Intimidation, and Religion\. If you would automatically become trained in one of those skills \(from your background or class, for example\), you instead become trained in a skill of your choice\. You also gain the Additional Lore general feat for a Lore subcategory of a plane to which you trace your lineage\./, "Conoces los secretos del Multiverso. Obtienes el rango de competencia entrenado en Diplomacia o Intimidación, y en Religión. Si estás automáticamente entrenado en una de dichas habilidades (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. También obtienes la dote general Saber adicional para una subcategoría de Saber de un Plano al que trazas tu linaje."],
            [/You've always had a tail, but with practice, you've learned to use it for more than signaling your mood\. You can perform simple Interact actions with your tail, such as opening an unlocked door\. Your tail can't perform actions that require fingers or significant manual dexterity, including any action that would require a check to accomplish, and you can't use it to hold items\./, "Siempre has tenido cola, pero con la práctica has aprendido a utilizarla para algo más que para indicar tu estado de ánimo. Puedes llevar a cabo acciones sencillas de Interactuar con la cola, como por ejemplo abrir una puerta que no está cerrada con llave. Tu cola no puede llevar a cabo acciones que requieren dedos o una destreza manual significativa, incluyendo cualquier acción que requiere una prueba para tener éxito, y no puedes utilizarla para sostener objetos."],
            [/You resist energy like your extraplanar predecessors\. Choose one of the following energy damage types: acid, cold, electricity, fire, or sonic\. You gain resistance 5 to that damage type\./, "Resistes a la energía como tus predecesores extraplanarios. Elige entre uno de los siguientes tipos de daño por energía: ácido, electricidad, frío, fuego o sónico. Obtienes resistencia 5 a ese tipo de daño."],
            [/The damage type typically matches an extraplanar entity associated with your bloodline\. For instance, an angelkin might choose resistance to cold, while a hellspawn might choose resistance to fire\./, "El tipo de daño suele encajar con un ser extraplanario asociado a tu linaje. Por ejemplo un angélico podría elegir resistencia al frío, mientras que un prole infernal podría elegir resistencia al fuego."],
            [/Your spilled blood is sanctified, with effects similar to those of holy water\. Whenever a fiend, undead, or creature with a weakness to holy drinks your blood or deals piercing or slashing damage to you with jaws, fangs, or a similar attack, that creature takes 1d6 spirit damage with the holy trait\. You gain a \+4 circumstance bonus to Crafting checks to Craft holy water using your blood as one of the ingredients\./, "Tu sangre recién derramada está santificada, con efectos similares a los del agua bendita. Si un infernal, muerto viviente o criatura con debilidad a lo sagrado bebe tu sangre o te inflige daño perforante o cortante mediante mandíbulas, colmillos o un ataque similar, dicha criatura sufre 1d6 daño espiritual con el rasgo sagrado. Tienes un bonificador +4 por circunstancia a las pruebas de Artesanía para Elaborar agua bendita utilizando tu sangre como uno de los ingredientes."],
            [/You call upon divine power to place a benediction upon your allies or a malediction upon your foes\. Choose either bless or bane\. You can cast the chosen spell once per day as a 1st-rank divine innate spell\./, "Llamas al poder divino para que bendiga a tus aliados o maldiga a tus enemigos. Elige entre bendición y azote. Puedes lanzar el conjuro elegido una vez al día como conjuro innato divino de 1.er rango."],
            [/The long and complicated history of your bloodline manifests in your ability to draw power from more planar sources than most other nephilim\. Choose one nephilim lineage feat that you do not already possess; you gain that feat and all of its benefits, even if you already took a lineage feat at 1st level\./, "La larga y complicada historia de tu linaje se manifiesta en tu capacidad para extraer poder de más fuentes planarias que la mayoría de otros nefilim. Elige una dote de linaje de nefilim que aún no tienes; obtienes dicha dote y todos sus beneficios, incluso si ya habías adquirido una dote de linaje a 1.er nivel."],
            [/With effort, you can call forth magical wings from your back, similar in appearance to those of your extraplanar forebear, whether they be elegantly feathered wings or ominous bat wings\. These wings remain for 10 minutes\. You gain a fly Speed equal to your Speed while you've manifested your wings\./, "Con esfuerzo, puedes invocar en tu espalda unas alas mágicas de aspecto similar a las de tus antepasados extraplanarios, ya se trate de alas elegantemente emplumadas u ominosas alas de murciélago. Dichas alas duran 10 minutos. Obtienes una Velocidad de volar igual a tu Velocidad terrestre mientras tus alas se manifiestan."],
            [/You've studied your extraplanar heritage with the intent of better defending yourself, whether against creatures aligned with or opposed to your extraplanar lineage, and you've found that your techniques are equally powerful against celestials, fiends, and other divine entities\. You gain a \+1 circumstance bonus to all saving throws against divine effects\./, "Has estudiado tu herencia extraplanaria con el intento de defenderte mejor, ya sea contra criaturas alineadas con tu linaje extraplanario u opuestas al mismo, y has visto que tus técnicas son igualmente poderosas contra celestiales, infernales y otros seres divinos. Obtienes un bonificador +1 por circunstancia a todas las tiradas de salvación contra efectos divinos."],
            [/You possess celestial magic\. Choose two of the following spells: clear mind, everlight, humanoid form, revealing light, share life, or sure footing\. You can use each of the chosen spells once per day as 2nd-rank divine innate spells\./, "Dispones de magia celestial. Elige dos de entre los siguientes conjuros: compartir vida, forma humanoide, luz eterna, luz reveladora, despejar la mente o pisada segura. Puedes utilizar cada uno de los conjuros elegidos una vez al día como conjuro innato divino de 2.º rango."],
            [/Angelkin typically take clear mind and humanoid form, lawbringers typically have everlight and share life, and musetouched typically have revealing light and sure footing\./, "Los angélicos suelen elegir despejar la mente y forma humanoide, los legisladores típicamente eligen luz eterna y compartir vida y los tocados por las musas acostumbran a disponer de luz reveladora y pisada segura."],
            [/You possess fiendish magic\. Choose two of the following spells: disguise magic, false vitality, invisibility, see the unseen, shatter, or paranoia\. You can use each of the chosen spells once per day as 2nd-rank divine innate spells\./, "Dispones de magia infernal. Elige dos de los siguientes conjuros: disfrazar magia, estallar, falsa vitalidad, invisibilidad, paranoia o ver lo invisible. Puedes utilizar cada uno de los conjuros elegidos una vez al día como conjuro innato divino de 2.º rango."],
            [/Grimspawn typically take false vitality and see the unseen, pitborn typically take paranoia and shatter, and hellspawn typically take invisibility and disguise\./, "Los engendros macabros suelen elegir falsa vitalidad y ver lo invisible, los nacidos del foso, paranoia y estallar y la prole infernal, invisibilidad y disfrazar magia."],
            [/You have a connection to the Outer Planes, allowing you to summon a divine ally\. Choose either summon celestial, summon fiend, or another 5th-rank spell capable of summoning an extraplanar creature appropriate to your lineage\. Once per day, you can cast the chosen spell as a 5th-rank divine innate spell, but the creature summoned must be from the same category as your own lineage, such as a creature with the angel trait if you are an angelkin\./, "Tienes una conexión con los Planos Exteriores, que te permite convocar a un aliado divino. Elige convocar celestial, convocar infernal u otro conjuro de 5.º rango capaz de llamar a una criatura extraplanaria apropiada a tu linaje. Una vez al día, puedes lanzar el conjuro elegido como un conjuro innato divino de 5.º rango, pero la criatura convocada debe ser de la misma categoría que tu linaje, como por ejemplo una criatura con el rasgo ángel si eres un angelical."],
            [/Like many fiends, you have the supernatural ability to teleport yourself to safety\. Once per day, you can cast translocate as a 5th-rank divine innate spell\./, "Como muchos infernales, tienes la aptitud sobrenatural de teletransportarte a un lugar seguro. Una vez al día, puedes lanzar cambiar de sitio como un conjuro innato divino de 5.º rango."],
            [/Your celestial powers allow you to remove lesser afflictions with ease\. You can cast cleanse affliction twice per day as a 4th-rank divine innate spell\./, "Tus poderes celestiales te permiten eliminar aflicciones menores con facilidad. Puedes lanzar limpiar aflicción una vez al día como conjuro innato divino de 4.º rango."],
            [/Your wings are now a permanent part of your body\. You gain the effects of Divine Wings at all times, rather than just once per day for 10 minutes\./, "Tus alas forman ahora parte permanente de tu cuerpo. Obtienes los efectos de Alas divinas en todo momento, en lugar de tan sólo una vez al día durante 10 minutos."],
            [/You can call forth a holy or unholy word from the realms beyond to punish your foes\. Once per day, you can cast divine decree as a 7th-rank divine innate spell\./, "Puedes pronunciar una palabra sagrada o sacrílega procedente de los reinos que hay más allá para castigar a tus enemigos. Una vez al día, puedes lanzar decreto divino como un conjuro innato divino de 7.º rango."],
            [/Your elven blood runs particularly strong, granting you features far more elven than those of a typical aiuvarin\. You may also have been raised among elves, steeped in your elven ancestors' heritage\. You gain the benefits of the elf heritage of your elven parent or ancestors\. You typically can't select a heritage that depends on or improves an elven feature you don't have\. For example, you couldn't take the Ancient Elf heritage unless your non-elf ancestry also has a lifespan measured in multiple centuries\. In these cases, at the GM's discretion, you might gain a different benefit\./, "Tu sangre elfa es particularmente fuerte, concediéndote rasgos mucho más élficos que los de un aiuvarin típico. También podrías haber sido criado entre elfos, sumergido en la herencia de tus antepasados elfos. Obtienes los beneficios de la herencia élfica de tu pariente o antepasados elfos. Por lo general no puedes seleccionar una herencia que dependa de un rasgo élfico que no tienes o lo mejore. Por ejemplo, no puedes adoptar la herencia Elfo antiguo a menos que tu ascendencia no elfa también tenga un intervalo de vida medido en múltiples siglos. En dichos casos, y a discreción del DJ, podrías obtener un beneficio diferente."],
            [/Elves often struggle with underestimating aiuvarins, and you are experienced at telling stories of your accomplishments to gain their respect\. You are trained in Performance\. If you would automatically become trained in Performance \(from your background or class, for example\), you instead become trained in a skill of your choice\. You gain the Impressive Performance feat\. When you attempt a Performance check to Make an Impression on an elf, if you roll a critical failure, you get a failure instead\./, "Los elfos a menudo tienden a subestimar a los aiuvarins, y tienes experiencia en relatar historias de tus logros para ganarte su respeto. Obtienes el rango entrenado en Interpretación. Si ya estás entrenado en Interpretación (por ejemplo debido a tu bagaje o a tu clase), en su lugar obtienes el rango entrenado en una habilidad a tu elección. Obtienes la dote Interpretación impresionante. Cuando haces una prueba de Interpretar para Causar impresión a un elfo, si sufres un fallo crítico, en su lugar sufres tan sólo un fallo."],
            [/The elven magic in your blood manifests as a force you can use to become more appealing or alluring\. You can cast 1st-rank charm as an arcane innate spell once per day\./, "La magia élfica de tu sangre se manifiesta como una fuerza que puedes utilizar para hacerte más atractivo o seductor. Puedes lanzar hechizar como un conjuro innato arcano de 1.er rango una vez al día."],
            [/Your actions inspire your allies to great achievements\. Whenever you critically succeed at a skill check, you automatically qualify to use the Aid reaction when attempting to help an ally using the same skill, even without spending an action to prepare to do so\./, "Tus acciones inspiran a tus aliados a grandes logros. Si obtienes un éxito crítico en una prueba de habilidad, automáticamente te calificas para utilizar la reacción Prestar ayuda cuando tratas de ayudar a un aliado utilizando la misma habilidad, incluso sin invertir una acción para prepararte para ello."],
            [/Your dual human and orc nature has given you a unique perspective, allowing you to bridge the gap between humans and the many intelligent creatures in the world that humans consider monsters\. You gain a \+1 circumstance bonus to Diplomacy checks against non-humanoid intelligent creatures and against humanoids that are marginalized in human society \(at the GM's discretion, but typically at least including giants, goblins, kobolds, and orcs\)\. You also gain this bonus on Perception checks to Sense the Motives of such creatures\./, "Tu naturaleza dual de humano y orco te ha otorgado una perspectiva única, permitiéndote cruzar la brecha entre los humanos y las muchas criaturas inteligentes del mundo a las que los humanos consideran monstruos. Obtienes un bonificador +1 por circunstancia a las pruebas de Diplomacia contra criaturas inteligentes no humanoides y contra los humanoides marginalizados en la sociedad humana (a discreción del DJ, pero típicamente incluyendo al menos los gigantes, los goblins, los kóbolds y los orcos). También obtienes este bonificador a las pruebas de Percepción para Averiguar las intenciones de dichas criaturas."],
            [/Your orc blood grants you the keen vision of your forebears\. You gain darkvision, allowing you to see in darkness and dim light just as well as you can in bright light\. However, in darkness, you see in black and white only\./, "Tu sangre de orco te concede la aguda vista de tus antepasados. Obtienes visión en la oscuridad, lo que te permite ver en condiciones de oscuridad y de luz tenue igual de bien que en luz brillante. Sin embargo, en la oscuridad sólo ves en blanco y negro."],

            // ancestry descriptions
            [/Dwarves are a short, stocky people who are often stubborn, fierce, and devoted\./, "Los enanos son un pueblo bajito y fornido, que a menudo es obstinado, fiero y devoto."],
            [/Elves are a tall, long-lived people with a strong tradition of art and magic\./, "Los elfos son un pueblo alto y de larga vida, con una fuerte tradición en el arte y en la magia."],
            [/Gnomes are short and hardy folk, with an unquenchable curiosity and eccentric habits\./, "Los gnomos son un pueblo bajito y recio, con una curiosidad inacabable y hábitos excéntricos."],
            [/Goblins are a short, scrappy, energetic people who have spent millennia maligned and feared\./, "Los goblins son un pueblo bajito, peleón y enérgico que se ha pasado milenios siendo difamado y temido."],
            [/Halflings are a short, resilient people who exhibit remarkable curiosity and humor\./, "Los medianos son un pueblo bajito y resiliente que exhibe una curiosidad y un sentido del humor notables."],
            [/Humans are diverse and adaptable people with wide potential and deep ambitions\./, "Los humanos son un pueblo diverso y adaptable, con un amplio potencial y profundas ambiciones."],
            [/Leshies are immortal nature spirits placed in small plant bodies, seeking to experience the world\./, "Los leshys son espíritus inmortales de la Naturaleza, situados en el cuerpo de plantas pequeñas, que buscan experimentar el mundo."],
            [/Orcs are proud, strong people with hardened physiques who value physical might and glory in combat\./, "Los orcos son un pueblo orgulloso y fuerte, de complexión recia, que valora la potencia física y la gloria en combate."],

            // ancestry feature descriptions
            [/You can see in dim light as though it were bright light, and you ignore the concealed condition due to dim light\./, "Puedes ver en luz tenue como si fuera luz brillante, por lo que ignoras el estado oculto debido a la luz tenue."],
            [/You can see in darkness and dim light just as well as you can see in bright light, though your vision in darkness is in black and white\./, "Puedes ver en la oscuridad y en luz tenue igual de bien que con luz brillante, aunque tu visión en la oscuridad es en blanco y negro."],
            [/You get one clan dagger for free, as it was given to you at birth\. Selling this clan dagger is a terrible taboo and earns you the disdain of other dwarves\./, "Obtienes una daga de clan gratis, que te fue regalada cuando naciste. Vender esta daga de clan es un tabú terrible y te podría granjear el desdén de otros enanos."],
            [/Your eyes are sharp, allowing you to make out small details about concealed or even invisible creatures that others might miss\. You gain a \+2 circumstance bonus when using the Seek action to find hidden or undetected creatures within 30 feet of you\. When you target an opponent that is concealed from you or hidden from you, reduce the DC of the flat check to 3 for a concealed target or 9 for a hidden one\./, "Tu vista es aguda, permitiéndote distinguir pequeños detalles acerca de criaturas ocultas o incluso invisibles, que otros podrían pasar por alto. Obtienes un bonificador +2 por circunstancia al utilizar la acción de Buscar para encontrar criaturas escondidas o no detectadas a 30 pies (9 m) o menos de ti. Cuando designas como objetivo a un oponente que está oculto o escondido de ti, reduce la CD de la prueba plana a un 3 para un objetivo oculto o a 9 para uno escondido."],
            [/\bYou gain nourishment in the same way that the plants or fungi that match your body type normally do, through some combination of photosynthesis, absorbing minerals with your roots, or scavenging decaying matter\. You typically do not need to pay for food\. If you normally rely on photosynthesis and go without sunlight for 1 week, you begin to starve\. You can derive nourishment from specially formulated bottles of sunlight instead of natural sunlight, but these bottles cost 10 times as much as standard rations \(or 40 sp\)\./i, "Te nutres de la misma forma que las plantas o los hongos que encajan con tu tipo de cuerpo, mediante alguna combinación de fotosíntesis, absorbiendo minerales con tus raíces o forrajeando materia orgánica en descomposición. Lo normal es que no tengas que pagar por la comida. Si sueles basarte en la fotosíntesis y pasas 1 semana aislado de la luz del sol, empiezas a pasar hambre. Tu sustento puede provenir de unas botellas especialmente formuladas de luz solar en lugar de la luz natural, pero estas botellas cuestan 10 veces más que las raciones estándar (es decir, unas 40 pp)."],

            // heritage descriptions
            [/In your long life, you’ve dabbled in many paths and many styles\. A typical ancient elf is at least 100 years old, though you might be younger at the GM’s discretion\. Choose a class other than your own\. You gain the multiclass dedication feat for that class, even though you don’t meet its level prerequisite\. You must still meet its other prerequisites to gain the feat\./, "En tu larga vida, te has aventurado en muchos caminos y muchos estilos. Un elfo antiguo típico tiene por lo menos cien años de edad, aunque podrías ser más joven a discreción del DJ. Elige una clase diferente a la tuya. Obtienes la dote de dedicación multiclase para dicha clase, incluso si no cumples su prerrequisito de nivel. Sigues teniendo que cumplir los demás prerrequisitos para obtener la dote."],
            [/You dwell deep in the frozen north and have gained incredible resilience against cold environments, granting you cold resistance equal to half your level \(minimum 1\)\. You treat environmental cold effects as if they were one step less extreme \(incredible cold becomes extreme, extreme cold becomes severe, and so on\)\./, "Vives en lo más profundo del norte congelado y has obtenido una increíble resistencia a los entornos fríos, lo que te concede una resistencia al frío igual a la mitad de tu nivel (mínimo 1). Tratas los efectos ambientales de frío como si fueran un grado menos extremos (un frío increíble se vuelve extremo, un frío extremo se vuelve severo, y así sucesivamente)."],
            [/You were born or spent many years in underground tunnels or caverns where light is scarce\. You gain darkvision\./, "Naciste o pasaste muchos años en túneles subterráneos o cavernas donde la luz escasea. Obtienes visión en la oscuridad."],
            [/Your ears are finely tuned, able to detect even the slightest whispers of sound\. You gain a \+2 circumstance bonus when using the Seek action to find hidden or undetected creatures within 30 feet of you\. When you target an opponent that is concealed from you or hidden from you, reduce the DC of the flat check to 3 for a concealed target or 9 for a hidden one\. This benefit doesn’t apply if you can’t hear or if the creature is incapable of making sound \(for example, if it’s affected by a silence spell\)\./, "Tus oídos están muy aguzados y son capaces de detectar incluso el más leve susurro o sonido. Obtienes un bonificador +2 por circunstancia al utilizar la acción Buscar para encontrar criaturas escondidas o no detectadas a 30 pies (9 m) o menos de ti. Cuando designas como objetivo a un oponente que está oculto o escondido de ti, reduce la CD de la prueba plana a 3 para un objetivo oculto o a 9 para uno escondido. Este beneficio no se aplica si no puedes oír o si la criatura es incapaz de emitir sonidos (por ejemplo, si se ve afectada por un conjuro de silencio)."],
            [/You’re adapted to life in the forest or the deep jungle, and you know how to climb trees and use foliage to your advantage\. When Climbing trees, vines, and other foliage, you move at half your Speed on a success and at full Speed on a critical success \(and you move at full Speed on a success if you have Quick Climb\)\. This doesn’t affect you if you’re using a climb Speed\./, "Estás adaptado a la vida en el bosque, en lo más profundo de la jungla o en un entorno similar, y sabes trepar a los árboles y usar el follaje en tu ventaja. Cuando Trepas a árboles, lianas y otro follaje, te mueves a la mitad de tu Velocidad con un éxito, y a Velocidad completa con un éxito crítico (y, si tienes Escalada rápida, te mueves a Velocidad completa con un éxito). Esto no te afecta si utilizas una Velocidad de trepar."],
            [/You can always use the Take Cover action when you are within forest terrain to gain cover, even if you’re not next to an obstacle you can Take Cover behind\./, "Siempre puedes utilizar la acción Ponerte a cubierto cuando estás en terreno de bosque para cubrirte, incluso si no estás cerca de un obstáculo tras el que te puedes Poner a cubierto."],
            [/You have an inborn ability to detect and understand magical phenomena\. You can cast the detect magic cantrip as an arcane innate spell at will\. A cantrip is heightened to a spell level equal to half your level rounded up\./, "Tienes una aptitud innata para detectar y entender los fenómenos mágicos. Puedes lanzar a voluntad el truco mágico detectar magia como un conjuro innato arcano. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba."],
            [/In addition, you gain a \+1 circumstance bonus to checks to Identify Magic and to Decipher Writing of a magical nature\. These skill actions typically use the Arcana, Nature, Occultism, or Religion skill\./, "Además, obtienes un bonificador +1 por circunstancia a las pruebas para Identificar magia y para Descifrar escritura de naturaleza mágica. Estas acciones de ha- bilidad suelen utilizar las habilidades Arcanos, Naturaleza, Ocultismo o Religión."],
            [/You have a remarkable adaptation to hot environments from ancestors who inhabited blazing deserts or volcanic chambers beneath the earth\. This grants you fire resistance equal to half your level \(minimum 1\), and you treat environmental heat effects as if they were one step less extreme \(incredible heat becomes extreme, extreme heat becomes severe, and so on\)\./, "Tienes una notable adaptación a los entornos cálidos. Eso te concede una resistencia al fuego igual a la mitad de tu nivel (mínimo 1), y tratas los efectos del calor ambiental como si fueran un grado menos extremos (un calor increíble se convierte en extremo, un calor extremo se convierte en severo, y así sucesivamente)."],
            [/Your ancestors lived and worked among the great ancient stones of the mountains or the depths of the earth\. This makes you solid as a rock when you plant your feet\. You gain a \+2 circumstance bonus to your Fortitude or Reflex DC against attempts to Shove or Trip you\. This bonus also applies to saving throws against spells or effects that attempt to knock you prone\./, "Tus antepasados vivieron y trabajaron entre las antiguas piedras de las montañas o en las profundidades de la tierra. Esto te hace tan sólido como una roca cuando plantas los pies. Obtienes un bonificador +2 por circunstancia a tu CD de Fortaleza o de Reflejos contra intentos de Reposicionarte, Empujarte o Derribarte. Este bonificador también se aplica a las tiradas de salvación contra conjuros o efectos que intentan obligarte a moverte o tirarte al suelo."],
            [/In addition, if any effect would force you to move 10 feet or more, you are moved only half the distance\./, "Además, si cualquier efecto te obligaría a moverte 10 pies (3 m) o más, sólo te mueves la mitad de la distancia."],
            [/Dwarven heroes of old could shrug off their enemies’ magic, and some of that resistance manifests in you\. You gain the Call on Ancient Blood reaction\./, "Los héroes enanos de la antigüedad podían sacudirse la magia de sus enemigos y parte de dicha resistencia se manifiesta en ti. Obtienes la reacción Llamar a la sangre antigua."],
            [/Call on Ancient Blood/, "Llamar a la sangre antigua"],
            [/You attempt a saving throw against a magical effect, but you haven’t rolled yet/, "Haces una tirada de salvación contra un efecto mágico pero aún no has tirado los dados"],
            [/Your ancestors’ innate resistance to magic surges before slowly ebbing down\. You gain a \+1 circumstance bonus to saving throws on the triggering save and other saves against magical effects until the end of this turn\./, "La resistencia innata a la magia de tus antepasados surge en ti antes de refluir. Obtienes un bonificador +1 por circunstancia a las tiradas de salvación desencadenante y a otras salvaciones contra efectos mágicos hasta el final de este turno."],
            [/Your blood runs hearty and strong, and you can shake off toxins\. You gain poison resistance equal to half your level \(minimum 1\), and each of your successful saving throws against a poison affliction reduces its stage by 2, or by 1 for a virulent poison\. Each critical success against an ongoing poison reduces its stage by 3, or by 2 for a virulent poison\./, "Tu sangre corre sana y fuerte y puedes deshacerte de las toxinas. Obtienes tanta resistencia al veneno como la mitad de tu nivel (mínimo 1) y cada una de tus tiradas de salvación sucesivas contra una aflicción venenosa reduce en 2 su etapa, o en 1 si se trata de un veneno virulento. Cada éxto crítico contra un veneno continuado reduce en 3 su etapa, o en 2 si se trata de un veneno virulento."],
            [/Your ancestors were tomb guardians, and their power to ward off death passed on to you\. If you roll a success on a saving throw against an effect that has the void trait or was created by an undead creature, you get a critical success instead\./, "Tus antepasados fueron guardianes de tumbas y su poder para protegerse de la muerte ha llegado hasta ti. Si obtienes un éxito en una tirada de salvación contra un efecto con el rasgo vacío o creado por una criatura muerta viviente, obtienes en su lugar un éxito crítico."],
            [/The color of your hair and skin is mutable, possibly due to latent magic from First World influences or lingering illusion effects\. You can slowly change the vibrancy and the exact color, and the coloration can be different across your body, allowing you to create patterns or other colorful designs\. It takes a single action for minor localized shifts and up to an hour for dramatic shifts throughout your body\. While you’re asleep, the colors shift on their own in tune with your dreams, giving you an unusual coloration each morning\. When you’re in an area where your coloration is roughly similar to the environment \(for instance, forest green in a forest\), you can use the single action to make minor localized shifts designed to help you blend into your surroundings\. This grants you a \+2 circumstance bonus to Stealth checks until your surroundings shift in coloration or pattern\./, "El color de tu piel y el de tu pelo son mutables, posiblemente debido a magia latente que deriva de influencias del Primer Mundo o de efectos de ilusión residuales. Puedes cambiar lentamente la intensidad y el color exacto, y la coloración puede ser diferente en todo tu cuerpo, lo que te permite crear esquemas u otros diseños coloridos. Sólo te hace falta una acción para llevar a cabo cambios menores localizados y hasta una hora para cambios dramáticos en todo tu cuerpo. Mientras duermes, los colores cambian por iniciativa propia en sintonía con tus sueños, lo que por la mañana te proporciona una coloración poco usual. Cuando estás en una zona en la que tu coloración es aproximadamente similar a la del entorno (por ejemplo, verde bosque en un bosque), podrás utilizar una acción para llevar a cabo cambios localizados menores que te ayuden a mezclarse con lo que te rodea. Eso te concede un bonificador +2 por circunstancia a las pruebas de Sigilo hasta que lo que te rodea cambia de coloración o de esquema."],
            [/Some other source of magic has a greater hold on you than the primal magic of your fey lineage does\. This connection might come from an occult plane or an ancient occult song; a deity, celestial, or fiend; magical effluent left behind by a mage war; or ancient rune magic\./, "Tienes una fuerte conexión con alguna otra fuente de magia, y no con la magia primigenia de tu ascendencia feérica. Dicha conexión podría proceder de un Plano oculto o de una antigua canción ocultista; un dios, celestial o infernal; un efluente mágico que quedó atrás después de la guerra entre magos; o antigua magia rúnica."],
            [/Choose arcane, divine, or occult\. You gain one cantrip from that magical tradition’s spell list\. You can cast this spell as an innate spell at will, as a spell of your chosen tradition\. A cantrip is heightened to a spell rank equal to half your level rounded up\. Whenever you gain a primal innate spell from a gnome ancestry feat, change its tradition from primal to your chosen tradition\./, "Elige entre arcana, divina y ocultista. Obtienes un truco de la lista de conjuros de dicha tradición mágica. Puedes lanzar este conjuro a voluntad como un conjuro innato de la tradición elegida por ti. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba. Siempre que obtienes un conjuro innato primigenio de una dote de ascendencia de gnomo, cambia su tradición de primigenia a la elegida por ti."],
            [/You see all colors as brighter, hear all sounds as richer, and especially smell all scents with incredible detail\. You gain a special sense: imprecise scent with a range of 30 feet\. This means you can use your sense of smell to determine the exact location of a creature\. The GM will usually double the range if you’re downwind from the creature or halve the range if you’re upwind\./, "Ves todos los colores más brillantes, oyes todos los sonidos mejor y, especialmente, detectas todos los olores con increíble detalle. Obtienes un sentido especial: olfato impreciso con un rango de distancia de 30 pies (9 m). Esto significa que puedes utilizar tu sentido del olfato para determinar la ubicación exacta de una criatura. El DJ por lo general doblará el rango de distancia si estás a sotavento de la criatura o lo reducirá a la mitad si estás a barlovento."],
            [/In addition, you gain a \+2 circumstance bonus to Perception checks whenever you’re trying to locate an undetected creature that is within the range of your scent\./, "Además obtienes un bonificador +2 por circunstancia a las pruebas de Percepción siempre que tratas de localizar una criatura no detectada dentro del rango de distancia de tu olfato."],
            [/Whether from a connection to dark or shadowy fey, from the underground gnomes known as drathnelar, or from another source, you can see in complete darkness\. You gain darkvision\./, "Ya sea debido a una conexión con las hadas oscuras o sombrías, con los gnomos de las profundidades conocidos como drathlenar o con alguna otra fuente, puedes ver en la más completa oscuridad. Obtienes visión en la oscuridad."],
            [/The blood of the fey is so strong within you that you’re truly one of them\. You gain the fey trait, in addition to the gnome and humanoid traits\. Choose one cantrip from the primal spell list\. You can cast this spell as a primal innate spell at will\. A cantrip is heightened to a spell level equal to half your level rounded up\. You can change this cantrip to a different one from the same list once per day by meditating to realign yourself with the First World; this is a 10-minute activity that has the concentrate trait\./, "La sangre de las hadas fluye por tus venas, saturándote con su magia y convirtiéndote en una de ellas. Obtienes el rasgo hada, además de los rasgos gnomo y humanoide. Elige un truco de la lista de conjuros primigenios. Puedes lanzarlo a voluntad como un conjuro innato primigenio. Un truco se potencia a un rango de conjuro igual a la mitad de tu nivel redondeado hacia arriba. Puedes cambiar este truco por uno diferente de la misma lista una vez al día meditando para volverte a alinear con el Primer Mundo; ésta es una actividad de 10 minutos con el rasgo concentrar."],
            [/You are acclimated to living in frigid lands and have skin ranging from sky blue to navy in color, as well as blue fur\. You gain cold resistance equal to half your level \(minimum 1\)\. You treat environmental cold effects as if they were one step less extreme \(incredible cold becomes extreme, extreme cold becomes severe, and so on\)\./, "Estás aclimatado a la vida en territorios gélidos y tienes la piel de un color que va desde el azul celeste al azul marino, además de un pelaje azul. Obtienes tanta resistencia al frío como la mitad de tu nivel (mínimo 1). Tratas los efectos ambientales de frío como si fueran un grado menos extremos (un frío increíble se vuelve extremo, un frío extremo se vuelve severo, y así sucesivamente)."],
            [/Your family’s teeth are formidable weapons\. You gain a jaws unarmed attack that deals 1d6 piercing damage\. Your jaws are in the brawling group and have the finesse and unarmed traits\./, "Los dientes de tu familia son armas formidables. Obtienes un ataque sin armas de mandíbula que inflige 1d6 daño perforante. Tu mandíbula se encuentra en el grupo pelea y tiene los rasgos sutil y sin armas."],
            [/You’re able to bounce back from injuries easily due to an exceptionally thick skull, cartilaginous bones, or some other mixed blessing\. You gain 10 Hit Points from your ancestry instead of 6\. When you fall, reduce the falling damage you take as though you had fallen half the distance\./, "Eres capaz de recuperarte rápidamente de las heridas debido a un cráneo excepcionalmente grueso, huesos cartilaginosos o alguna otra cosa con ventajas e inconvenientes. Obtienes 10 Puntos de Golpe debido a tu ascendencia en lugar de 6. Cuando caes, reduces el daño por caída sufrido como si sólo hubieras caído la mitad de la distancia."],
            [/Your ancestors have always had a connection to fire and a thicker skin, which allows you to resist burning\. You gain fire resistance equal to half your level \(minimum 1\)\. You can also recover from being on fire more easily\. Your flat check to remove persistent fire damage is DC 10 instead of DC 15, which is reduced to DC 5 if another creature uses a particularly appropriate action to help\./, "Tus antepasados siempre han tenido conexión con el fuego y la piel más gruesa, lo que te permite resistir las quemaduras. Obtienes tanta resistencia al fuego como la mitad de tu nivel (mínimo 1). También puedes recuperarte más fácilmente de estar ardiendo. Tu prueba plana para eliminar el daño persistente por fuego es CD 10 en lugar de CD 15, que se reduce a CD 5 si otra criatura utiliza una acción particularmente apropiada para ayudarte."],
            [/You can subsist on food that most folks would consider spoiled\. You can keep yourself fed with poor meals in a settlement as long as garbage is readily available, without using the Subsist downtime activity\. You can eat and drink things when you are sickened\./, "Puedes subsistir con comida que la mayoría de la gente consideraría estropeada. Te puedes alimentar con comida de baja calidad en un asentamiento si hay basura fácilmente disponible, sin utilizar la habilidad de tiempo libre Subsistir. Puedes comer y beber cosas cuando estás indispuesto."],
            [/You gain a \+2 circumstance bonus to saving throws against afflictions, against gaining the sickened condition, and to remove the sickened condition\. When you roll a success on a Fortitude save affected by this bonus, you get a critical success instead\. All these benefits apply only when the affliction or condition resulted from something you ingested\./, "Obtienes un bonificador +2 por circunstancia a las tiradas de salvación contra las aflicciones, contra sufrir el estado indispuesto y para eliminar dicho estado. Cuando obtienes un éxito en una tirada de salvación afectada por este bonificador, en su lugar obtienes un éxito crítico. Todos estos beneficios sólo se aplican cuando la aflicción o estado resultan de algo que has comido."],
            [/Your ingenuity allows you to train in a wide variety of skills\. You become trained in one skill of your choice\. At 5th level, you become an expert in the chosen skill\./, "Tu ingenio te permite entrenar una amplia variedad de habilidades. Obtienes el rango entrenado en una habilidad a tu elección. A 5.º nivel, obtienes el rango experto en la habilidad elegida."],
            [/Humanity's versatility and ambition have fueled its ascendance to be the most common ancestry in most nations throughout the world\. Select a general feat of your choice for which you meet the prerequisites \(as with your ancestry feat, you can select this general feat at any point during character creation\)\./, "La versatilidad y la ambición de la humanidad han impulsado su ascenso hasta ser la ascendencia más común en la mayoría de las naciones del mundo. Selecciona una dote general a tu elección para la que cumples los prerrequisitos (igual que tu dote de ascendencia, puedes seleccionar esta dote general en cualquier momento durante la creación de personaje)."],
            [/You have a large gourd for a skull\. Your knowledge comes from within your spirit, rather than a physical brain, and you have found a handier use for the space inside your head\. You can store a collection of up to 1 Bulk of objects within your head\. The DC of checks to Steal objects from inside your head increases by 4\. Additionally, if you store only one object within your head, you can draw it effortlessly into your hand as part of another action to use the object\. Drawing the item grants this other action the manipulate trait\./, "Tienes una gran calabaza como cráneo y, como careces de cerebro físico, puedes utilizar el espacio que hay dentro de tu cabeza. Allí puedes guardar una colección de objetos de hasta Impedimenta 1. La CD de las pruebas para Sustraer objetos del interior de tu cabeza se incrementa en 4. Además, si sólo almacenas un objeto en tu cabeza, puedes extraerlo sin esfuerzo a tu mano como parte de otra acción de utilizarlo. Extraer el objeto concede a esta otra acción el rasgo manipular."],
            [/Your body is made from woven seaweed, and you're just as comfortable underwater as on land\. You gain a swim Speed of 20 feet, and you can always breathe underwater\. However, your land Speed is reduced by 5 feet \(to 20 feet for most seaweed leshys\)\./, "Tu cuerpo está hecho de algas marinas tejidas, y te sientes tan cómodo bajo el agua como en tierra. Obtienes una Velocidad de nadar de 20 pies (6 m) y siempre puedes respirar bajo el agua. Sin embargo, tu Velocidad terrestre se reduce en 5 pies (hasta 20 pies para la mayoría de leshys de las algas) (1,5 m y 6 m respectivamente)."],
            [/Your body continually produces small fruits imbued with primal magic\. At dawn each day, a new fruit ripens\. You or an ally can remove this fruit as an Interact action\. If a living creature that can derive sustenance from fruit consumes it as an Interact action within the next hour, they regain 1d8 Hit Points, plus an additional 1d8 Hit Points for every 2 of your levels beyond 1st\. This effect has the healing and vitality traits\./, "Tu cuerpo fabrica continuamente pequeñas frutas imbuidas de magia primigenia. Al amanecer de cada día, madura una nueva fruta. Tú o un aliado tuyo puede extraer dicha fruta como una acción de Interactuar. Si una criatura viva cuyo sustento puede provenir de la fruta la consume como una acción de Interactuar durante la siguiente hora, recupera 1d8 Puntos de Golpe además de 1d8 Puntos de Golpe adicionales por cada 2 de tus niveles más allá del 1.º. Este efecto tiene los rasgos curación y vitalidad."],
            [/Your body is made mostly from natural foliage, and like a leaf tumbling from a tree, you land from falls with particular grace\. You take no damage from falling, regardless of the distance you fall\./, "Tu cuerpo está hecho principalmente de follaje natural y, como una hoja que cae de un árbol, aterrizas de las caídas con una gracia particular. No sufres daño alguno por caída, sea cual sea la distancia que caes."],
            [/Your body is made from hardy roots that attach you firmly to the ground\. You gain 10 Hit Points from your ancestry instead of 8\. You can go without sunlight for 2 weeks before you begin to starve\. You gain a \+2 circumstance bonus to your Fortitude or Reflex DC against attempts to Reposition, Shove, or Trip you\. This bonus also applies to saving throws against spells or effects that attempt to move you or knock you prone\./, "Tu cuerpo está hecho de recias raíces que te fijan al suelo con firmeza. Obtienes 10 Puntos de Golpe debido a tu ascendencia en lugar de 8. Puedes subsistir sin luz solar durante 2 semanas antes de empezar a pasar hambre. Obtienes un bonificador +2 por circunstancia a tu CD de Fortaleza o de Reflejos contra intentos de Reposicionarte, Empujarte o Derribarte. Este bonificador también se aplica a las tiradas de salvación contra conjuros o efectos que intentan moverte o tumbarte."],
            [/The prehensile vines woven into your body grant you unmatched skill at climbing\. You do not need to have any hands free to Climb\. Additionally, if you roll a success on an Athletics check to Climb, you get a critical success instead\./, "Tus zarcillos prensiles te conceden una habilidad incomparable a la hora de trepar. No necesitas tener ninguna mano libre para Trepar. Además, si obtienes un éxito en una prueba de Atletismo para Trepar, en su lugar obtienes un éxito crítico."],
            [/Spines cover your body\. You gain a spine unarmed attack that deals 1d6 piercing damage\. Your spines are in the brawling group and have the finesse and unarmed traits\./, "Tu cuerpo está recubierto de espinas. Obtienes un ataque sin armas de espina que inflige 1d6 daño perforante. Tus espinas pertenecen al grupo pelea y tienen los rasgos sutileza y sin armas."],
            [/Your body was made from fungi that grows in the shade of caves and trees, and you are at home in dark caverns and warrens\. You gain darkvision\. You lose the plant trait and gain the fungus trait\./, "Tu cuerpo está hecho de hongos que crecen a la sombra de las cavernas y de los árboles, y te encuentras como en casa en las cavernas oscuras y las madrigueras. Obtienes visión en la oscuridad. Pierdes el rasgo planta y obtienes el rasgo hongo."],
            [/You effortlessly float on the surface of water\. You can walk on the surface of still water and other non-damaging liquids, moving at half your normal Speed\. You can also attempt to Balance to move across the surface of flowing water, using the DC of a Swim check to move through the water\. When you do this, you can’t move faster than half your Speed, and if you fail or critically fail, you fall into the water rather than the normal effects\./, "Flotas sin esfuerzo en la superficie del agua. Puedes caminar sobre la superficie de las aguas tranquilas y de otros líquidos no dañinos, moviéndote a la mitad de tu Velocidad normal. También puedes Mantener el equilibrio para cruzar una superficie de agua en movimiento, utilizando la CD de una prueba de Nadar para atravesar el agua. Cuando lo haces, no te puedes mover más rápido que la mitad de tu Velocidad, y si sufres un fallo o un fallo crítico, en lugar de los efectos normales caes al agua."],
            [/Your family line is known for keeping a level head and staving off fear when the chips were down, making them wise leaders and sometimes even heroes\. When you roll a success on a saving throw against an emotion effect, you get a critical success instead\./, "Tu línea familiar es conocida por tener la cabeza fría y superar el miedo cuando las cosas van mal. Cuando obtienes un éxito en una tirada de salvación contra un efecto de emoción, en su lugar obtienes un éxito crítico."],
            [/Accustomed to a calm life in the hills, your people find rest and relaxation especially replenishing, particularly when indulging in creature comforts\. When you regain Hit Points overnight, add your level to the Hit Points regained\. When anyone uses the Medicine skill to Treat your Wounds, you can eat a snack to add your level to the Hit Points you regain from their treatment\./, "Acostumbrada a una vida tranquila en las colinas, tu gente encuentra el descanso y la relajación especialmente satisfactorios, en particular cuando disfruta de las comodidades del hogar. Cuando recuperas Puntos de Golpe a lo largo de la noche, suma tu nivel a los Puntos de Golpe recuperados. Cuando alguien utiliza la habilidad Medicina para Tratar tus heridas, puedes comerte un tentempié para sumar tu nivel a los Puntos de Golpe recuperados del tratamiento."],
            [/You hail from deep within a jungle or forest, and you’ve learned how to use your small size to wriggle through undergrowth and other obstacles\. You ignore any difficult terrain caused by plants and fungi, such as bushes, vines, and undergrowth\./, "Procedes de las profundidades de una jungla o bosque y has aprendido a utilizar tu pequeño tamaño para escurrirte entre los matorrales y otros obstáculos. Ignoras cualquier terreno difícil debido a plantas y hongos, como por ejemplo arbustos, lianas y matorrales."],
            [/Your ancestors performed many secret acts under the concealing cover of dusk, whether for good or ill, and over time they developed the ability to see in twilight beyond even the usual keen sight of halflings\. You gain low-light vision\./, "Tus antepasados llevaron a cabo muchos actos secretos bajo la capa protectora del crepúsculo, para bien o para mal, y a lo largo del tiempo desarrollaron la aptitud de ver en el crepúsculo más allá incluso de la habitual buena vista de los medianos. Obtienes visión en la penumbra."],
            [/You were born with a strange blessing: bereft of the typical halfling luck, you can instead manipulate the fortunes of others\. You can never take the Halfling Luck feat, and you gain the Jinx action\./, "Naciste con una extraña bendición: desprovisto de la típica suerte de los medianos, en su lugar puedes manipular las fortunas de los demás. Nunca puedes adquirir la dote Suerte del mediano y obtienes la acción Gafar."],
            [/Jinx/, "Gafar"],
            [/Your ancestors have traveled from place to place for generations, never content to settle down\. You gain two additional languages of your choice, chosen from among the common and uncommon languages available to you, and every time you take the Multilingual feat, you gain another new language\./, "Tus antepasados han viajado de un lugar a otro durante generaciones, nunca dispuestos a asentarse. Obtienes 2 idiomas adicionales a tu elección, elegidos de entre los idiomas comunes y poco comunes disponibles para ti, y cada vez que adquieres la dote Multilingüe, obtienes un nuevo idioma."],
            [/You were born in a rain forest with only tangles of trees providing protection from torrential rainstorms and flash floods\. You've learned to move adeptly through jungle terrain and resist the various ailments common in humid environs\. You gain a \+2 circumstance bonus to Athletics checks to Climb or Swim and a \+1 circumstance bonus to saving throws against diseases\./, "Naciste en una selva tropical en la que sólo hay marañas de árboles que te protegen de las tormentas torrenciales y de las inundaciones repentinas. Has aprendido a moverte con destreza por los terrenos de la selva y a resistir las diversas dolencias comunes en los entornos húmedos. Obtienes un bonificador +2 por circunstancia a las pruebas de Atletismo para Trepar o Nadar y un bonificador +1 por circunstancia a las tiradas de salvación contra las enfermedades."],
            [/Your calloused hands and red eyes speak to a life spent in the deep darkness of mountain caverns, where you learned to battle on rocky cliffs and survive with minimal resources\. You gain the Terrain Expertise skill feat for underground terrain and the Combat Climber skill feat\./, "Tus manos callosas y tus ojos rojos relatan una vida pasada en la profunda oscuridad de las cavernas de las montañas, donde aprendiste a luchar en acantilados rocosos y a sobrevivir con los recursos mínimos. Obtienes la dote de habilidad Experiencia en un terreno para el terreno subterráneo y la dote de habilidad Trepador de combate."],
            [/You were exposed to powerful necromantic energies that should have killed you—but you survived\. Your skin is cold, clammy, and gray\. You gain resistance to void damage equal to half your level \(minimum 1\)\. You also gain a \+1 circumstance bonus to saving throws against effects with the death or void trait\./, "Fuiste expuesto a poderosas energías nigrománticas que deberían haberte matado… pero sobreviviste. Tu piel es fría, húmeda y gris. Obtienes tanta resistencia al daño por vacío como la mitad de tu nivel (mínimo 1). Obtienes también un bonificador +1 por circunstancia a las tiradas de salvación contra los efectos con los rasgos muerte o vacío."],
            [/You come from sun-scorched badlands, where long legs and an ability to withstand the elements helped you thrive\. You can Hustle twice as long while exploring before you have to stop, and you treat environmental heat effects as if they were one step less extreme \(incredible heat becomes extreme, extreme heat becomes severe, and so on\)\./, "Procedes de las tierras baldías azotadas por el sol, donde tus largas piernas y tu capacidad de resistir a los elementos te han ayudado a prosperar. Puedes Aligerar el doble de tiempo mientras exploras antes de tenerte que detener, y tratas los efectos del calor ambiental como si fueran un grado menos extremos (un calor increíble se convierte en extremo, un calor extremo se convierte en severo y así sucesivamente)."],
            [/Your ancestors survived in cold climates\. You become trained in Survival, and you treat environmental cold effects as if they were one step less extreme \(incredible cold becomes extreme, extreme cold becomes severe, and so on\)\./, "Tus antepasados sobrevivieron en climas fríos. Obtienes el rango entrenado en Supervivencia y tratas los efectos del frío ambiental como si fueran un grado menos extremos (un frío increíble se convierte en extremo, un frío extremo se convierte en severo y así sucesivamente)."],
            [/You descend from a line of terrifying battlefield commanders\. You become trained in Intimidation, and you gain the Intimidating Glare skill feat\./, "Desciendes una línea de terroríficos caudillos guerreros. Obtienes el rango entrenado en Intimidación y la dote de habilidad Mirada intimidante."],
            [/You are part of an orc community that participates in ritual scarification or tattooing\. The marks on your skin show your exceptional hardiness and vitality\. You gain 12 Hit Points from your ancestry instead of 10\. You also gain the Diehard feat\./, "Formas parte de una comunidad de orcos que practica rituales de escarificación o tatuajes. Las marcas de tu piel muestran tu excepcional resistencia y vitalidad. Obtienes 12 Puntos de Golpe debido a tu ascendencia en lugar de 10. También obtienes la dote Duro de pelar."],
            [/Your mother was a hag\. Your eyes' heterochromia is the most obvious signifier of this parentage, but you likely also have a slighter build, paler skin, and darker hair than most members of your other parent’s ancestry\. You gain the changeling trait\. You also gain low-light vision, or you gain darkvision if your ancestry already has low light vision\. You can select from changeling feats and feats from your other parent's ancestry whenever you gain an ancestry feat\./, "Tu madre era una saga. La heterocromía de tus ojos es el signo más evidente de este parentesco, pero también es probable que tengas una complexión más delgada, la piel más pálida y el pelo más oscuro que la mayoría de miembros de la ascendencia de tu otro progenitor. Obtienes el rasgo changeling. También obtienes visión en la penumbra, o visión en la oscuridad si tu ascendencia ya dispone de visión en la penumbra. Puedes seleccionar dotes de changeling y de la ascendencia de tu otro progenitor siempre que obtienes una dote de ascendencia."],
            [/Your nature is influenced by celestials, fiends, or monitors\. This manifests as a combination of features that belie your heritage, such as golden eyes, a halo, horns, or a tail\. You gain the nephilim trait, in addition to the traits from your ancestry\. You gain low-light vision, or you gain darkvision if your ancestry already has low-light vision\. You can choose from nephilim feats and feats from your ancestry whenever you gain an ancestry feat\./, "Tu naturaleza se ha visto influenciada por celestiales, infernales o monitores. Esto se manifiesta como una combinación de rasgos que delatan tu herencia, como por ejemplo ojos dorados, un halo, cuernos o una cola. Obtienes el rasgo nefilim, además de los de tu ascendencia. Obtienes visión en la penumbra, o bien visión en la oscuridad si tu ascendencia ya tenía visión en la penumbra. Puedes elegir entre dotes de nefilim y dotes de tu ascendencia siempre que obtienes una dote de ascendencia."],
            [/You have elves, or possibly other aiuvarins, in your family tree\. You have pointed ears and other telltale signs of elf heritage\. You gain the elf trait, the aiuvarin trait, and low light vision\. In addition, when you gain an ancestry feat, you can choose from aiuvarin and elf feats in addition to those from your ancestry,/, "Tienes elfos, o posiblemente otros aiuvarins en tu árbol genealógico. Tienes las orejas puntiagudas y otros signos reveladores de la herencia élfica. Obtienes el rasgo elfo, el rasgo aiuvarin y visión en la penumbra. Además, cuando obtienes una dote de ascendencia, puedes elegir entre las dotes de aiuvarin y de elfo además de las de tu otra ascendencia."],
            [/Orcish strength emboldens your bloodline\. You have a green tinge to your skin and other indicators of orc heritage\. You gain the orc trait, the dromaar trait, and low-light vision\. When you gain an ancestry feat, you can choose from dromaar and orc feats in addition to those from your ancestry\./, "La fuerza de los orcos potencia tu linaje. Tienes un tinte verde en la piel y otros indicadores de la herencia orca. Obtienes el rasgo orco, el rasgo dromaar y visión en la penumbra. Cuando obtienes una dote de ascendencia, puedes elegir entre las dotes de dromaar y de orco además de las derivadas de tu otra ascendencia."],
            [/You can work with your GM to create a mixed heritage for an ancestry other than elf or orc\. A custom mixed-ancestry heritage is an uncommon heritage\. Choose an ancestry to tie to the heritage\. You gain any traits of that ancestry and a new trait for your combined ancestry, similar to how the aiuvarin heritage below grants the “elf” and “aiuvarin” traits\. You also gain low-light vision if the ancestry tied to the heritage has low-light vision or darkvision\. The heritage lets you select ancestry feats for the chosen ancestry in addition to those from your base ancestry\. The aiuvarin and dromaar heritages both have special feats, but a custom heritage will need you to work with your GM to create or adapt some\./, "Puedes comentar con tu DJ la forma de crear una herencia mixta para una ascendencia diferente a elfo u orco. Una herencia de ascendencia mixta personalizada es una herencia poco común. Elige una ascendencia para vincular a la herencia. Obtienes cualquier rasgo de dicha ascendencia y un nuevo rasgo debido a tu ascendencia combinada, de la misma forma en que la herencia aiuvarin concede los rasgos \"elfo\" y \"aiuvarin\". También obtienes visión en la penumbra si la ascendencia vinculada a dicha herencia tiene visión en la penumbra o visión en la oscuridad. La herencia te permite seleccionar dotes de ascendencia para la elegida además de las que pertenecen a tu ascendencia base. Tanto la herencia aiuvarin como la dromaar tienen dotes especiales, pero una herencia personalizada requerirá que trabajes con el DJ para crear o adaptar algunas."],

            // background descriptions
            [/You spent your early days in a religious monastery or cloister\. You may have traveled out into the world to spread the message of your religion or because you cast away the teachings of your faith, but deep down, you’ll always carry within you the lessons you learned two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in the Religion skill and the Scribing Lore skill\. You gain the Student of the Canon skill feat\./, "Pasaste tus primeros días en un monasterio o claustro religioso. Puedes haber viajado por todo el mundo para extender el mensaje de tu religión o porque dejaste a un lado las enseñanzas de tu fe, pero en lo más profundo de tu interior siempre llevarás contigo las lecciones que aprendiste. Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Religión y Saber (escritura). Obtienes la dote de habilidad Alumno del canon."],
            [/In a circus or on the streets, you earned your pay by performing as an acrobat\. You might have turned to adventuring when the money dried up, or simply decided to put your skills to better use\./, "En un circo o en las calles, te ganaste el sustento haciendo de acróbata. Podrías haberte decidido por las aventuras cuando se te acabó el dinero o simplemente cuando decidiste dar un uso mejor a tus habilidades."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in the Acrobatics skill and the Circus Lore skill\. You gain the Steady Balance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Acrobacias y Saber (circo). Obtienes la dote de habilidad Equilibrio firme."],
            [/The strands of fate are clear to you, as you have learned many traditional forms by which laypeople can divine the future\. You might have used these skills to guide your community, or simply to make money\. But even the slightest peek into these practices connects you to the occult mysteries of the universe\./, "Las hebras del Destino son claras para ti, puesto que has aprendido muchas de las formas tradicionales por las que los legos pueden adivinar el futuro. Podrías haber utilizado dichas habilidades para guiar a tu comunidad, o simplemente para ganar dinero. Pero incluso el más leve atisbo de estas prácticas te conecta con los misterios ocultos del universo."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Occultism skill and the Fortune-Telling Lore skill\. You gain the Oddity Identification skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Ocultismo y Saber (buenaventura). Obtienes la dote de habilidad Identificación de extrañezas."],
            [/Through an education in the arts or sheer dogged practice, you learned to entertain crowds\. You might have been an actor, a dancer, a musician, a street magician, or any other sort of performer\./, "Gracias a una educación en las artes o bien debido a la práctica persistente, has aprendido a entretener a las multitudes. Puedes haber sido actor, bailarín, músico, mago callejero o cualquier otro tipo de animador."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Performance skill and the Theater Lore skill\. You gain the Fascinating Performance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Interpretar y Saber (teatro). Obtienes la dote de habilidad Interpretación fascinante."],
            [/As an apprentice, you practiced a particular form of building or crafting, developing a specialized skill\. You might have been a blacksmith’s apprentice toiling over the forge for countless hours, a young tailor sewing garments of all kinds, or a shipwright shaping the hulls of ships\./, "Como aprendiz, has practicado una forma particular de construir o de fabricar, desarrollando una habilidad especializada. Podrías haber sido un aprendiz de herrero, trabajando en la forja durante muchas horas, un joven sastre cosiendo ropa de todo tipo o un carpintero naval dando forma al casco de los barcos."],
            [/Choose two attribute boosts\. One must be to Strength or Intelligence, and one is a free attribute boost\. You’re trained in the Crafting skill and the Guild Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (gremio). Obtienes la dote de habilidad Especialidad artesana."],
            [/Your art is your greatest passion, whatever form it takes\. Adventuring might help you find inspiration, or simply be a way to survive until you become a world-famous artist\./, "Tu arte es tu mayor pasión, sea cual sea la forma que adopta. Salir de aventuras te podría ayudar a encontrar la inspiración o simplemente ser la forma de sobrevivir hasta que te conviertas en un artista de fama mundial."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Crafting skill and the Art Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (arte). Obtienes la dote de habilidad Especialidad artesana."],
            [/Your past includes no small amount of rural banditry, robbing travelers on the road and scraping by\. Whether your robbery was sanctioned by a local noble or you did so of your own accord, you eventually got caught up in the adventuring life\./, "Tu pasado incluye una cantidad poco desdeñable de bandidaje rural, robando a los viajeros y sobreviviendo por los pelos. Tanto si tus robos eran sancionados por un noble local o lo hiciste por propia iniciativa, acabaste por integrarte en la vida aventurera."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Intimidation skill and a Lore skill related to the terrain you worked in \(such as Desert Lore or Plains Lore\)\. You gain the Group Coercion skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Intimidación y en una habilidad de Saber relacionada con el terreno en el que trabajabas (como Saber [desierto] o Saber [llanuras]). Obtienes la dote de habilidad Intimidación de grupo."],
            [/You have five specialties: hefting barrels, drinking, polishing steins, drinking, and drinking\. You worked in a bar, where you learned how to hold your liquor and rowdily socialize\./, "Tienes cinco especialidades: levantar barriles, beber, pulir jarras, beber y beber. Trabajabas en un bar, donde aprendiste a resistir el licor y a socializar de forma bulliciosa."],
            [/Choose two attribute boosts\. One must be to Constitution or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Alcohol Lore skill\. You gain the Hobnobber skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (alcohol). Obtienes la dote de habilidad Confraternizador."],
            [/You called the wilderness home as you found trails and guided travelers\. Your wanderlust could have called you to the adventuring life, or perhaps you served as a scout for soldiers and found you liked battle\./, "Las tierras vírgenes eran tu hogar y en ellas encontrabas senderos por los que guiar a los viajeros. Tu ansia viajera te puede haber llevado a la vida de aventurero, o quizás fueras batidor para un ejército y averiguaste que te gustaba la batalla."],
            [/Choose two attribute boosts\. One must be to Dexterity or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and a Lore skill related to one terrain you scouted in \(such as Forest Lore or Cavern Lore\)\. You gain the Forager skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Supervivencia y además en una habilidad de Saber relacionada con un terreno por el que guiabas (como por ejemplo Saber [bosques] o Saber [cavernas]). Obtienes la dote de habilidad Forrajeador."],
            [/You’ve spent years performing arduous physical labor\. It was a difficult life, but you somehow survived\. You may have embraced adventuring as an easier method to make your way in the world, or you might adventure under someone else’s command\./, "Has pasado años llevando a cabo trabajos físicos arduos. Era una vida difícil, pero de alguna forma sobreviviste. Puedes haber abrazado las aventuras como forma más fácil de abrirte camino o te podrías aventurar a las órdenes de otro."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Athletics skill and the Labor Lore skill\. You gain the Hefty Hauler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (trabajo). Obtienes la dote de habilidad Porteador recio."],
            [/You stalked and took down animals and other creatures of the wild\. Skinning animals, harvesting their flesh, and cooking them were also part of your training, all of which can give you useful resources while you adventure\./, "Has perseguido y abatido animales y otras criaturas de las tierras vírgenes. Despellejar animales, preparar su carne y cocinarla formaron también parte de tu aprendizaje, todo lo cual te puede proporcionar recursos útiles al ir de aventuras."],
            [/Choose two attribute boosts\. One must be to Dexterity or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Tanning Lore skill\. You gain the Survey Wildlife skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (curtición). Obtienes la dote de habilidad Supervisor de la fauna."],
            [/Bringing in lawbreakers lined your pockets\. Maybe you had an altruistic motive and sought to bring in criminals to make the streets safer, or maybe the coin was motivation enough\. Your techniques for hunting down criminals transfer easily to the life of an adventurer\./, "Llevar ante un tribunal a los prófugos de la ley te llenaba los bolsillos. Quizás lo hacías por un motivo altruista y buscabas encerrar a los delincuentes para que las calles fueran más seguras, o quizás el dinero fuera motivo suficiente. Tus técnicas para perseguir delincuentes son fácilmente transferibles a la vida de un aventurero."],
            [/Choose two attribute boosts\. One must be to Strength or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Legal Lore skill\. You gain the Experienced Tracker skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (legal). Obtienes la dote de habilidad Rastreador experto."],
            [/You traveled from place to place, peddling false fortunes and snake oil in one town, while pretending to be royalty in exile to seduce a wealthy heir in the next\. Becoming an adventurer might be your next big scam or an attempt to put your talents to use for a greater cause\. Perhaps it’s a bit of both, as you realize that after pretending to be a hero, you’ve become the mask\./, "Has viajado de un lugar a otro, vendiendo falsos amuletos y aceite de serpiente en una población y pretendiendo pertenecer a la realeza en el exilio para seducir a una rica heredera en la siguiente. Convertirte en aventurero podría ser tu próxima gran estafa o un intento de poner tu talento al servicio de una causa mayor. Quizás es un poco de ambas cosas, puesto que das cuenta de que, después de haber pretendido ser un héroe, te has convertido en una máscara."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Deception skill and the Underworld Lore skill\. You gain the Charming Liar skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Engaño y Saber (bajos fondos). Obtienes la dote de habilidad Mentiroso encantador."],
            [/You grew up in the kitchens of a tavern or other dining establishment and excelled there, becoming an exceptional cook\. Baking, cooking, a little brewing on the side—you’ve spent lots of time out of sight\. It’s about time you went out into the world to catch some sights for yourself\./, "Creciste en la cocina de una taberna u otro establecimiento de comidas y allí llegaste a la excelencia, convirtiéndote en un cocinero excepcional. Horneando, cocinando, y elaborando un poco de cerveza, has pasado mucho tiempo desaparecido. Ya es hora de que salgas al mundo a ver cosas por tu cuenta."],
            [/Choose two attribute boosts\. One must be to Constitution or Intelligence, and one is a free attribute boost\. You’re trained in the Survival skill, and the Cooking Lore skill\. You gain the Seasoned skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (cocina). Obtienes la dote de habilidad Conocedor."],
            [/In your younger days, you waded into battle as a mercenary, a warrior defending a nomadic people, or a member of a militia or army\. You might have wanted to break away from the regimented structure of these forces, or you could have always been as independent a warrior as you are now\./, "En tus años mozos, te adentraste en la batalla como mercenario, combatiente defendiendo a un pueblo nómada, o miembro de una milicia o ejército. Podrías haber querido apartarte de la estructura regimentada de estas fuerzas o podrías haber sido siempre un combatiente independiente como eres ahora."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Intimidation skill and the Warfare Lore skill\. You gain the Intimidating Glare skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Intimidación y Saber (guerra). Obtienes la dote de habilidad Mirada intimidante."],
            [/This background is not available in Pathbuilder 2e\.  Please create a custom background according to your deity\./, "Este bagaje no está disponible en Pathbuilder 2e. Favor de crear un bagaje personalizado según tu dios."],
            [/As an unscrupulous independent or as a member of an underworld organization, you lived a life of crime\. You might have become an adventurer to seek redemption, to escape the law, or simply to get access to bigger and better loot\./, "Como un independiente carente de escrúpulos o como miembro de una organización de los bajos fondos, viviste una vida delictiva. Te podrías haber convertido en aventurero en busca de redención, para huir de la ley o simplemente para tener acceso a más y mejor botín."],
            [/Choose two attribute boosts\. One must be to Dexterity or Intelligence, and one is a free attribute boost\. You’re trained in the Stealth skill and the Underworld Lore skill\. You gain the Experienced Smuggler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sigilo y Saber (bajos fondos). Obtienes la dote de habilidad Contrabandista experto."],
            [/You solved crimes as a police inspector or took jobs for wealthy clients as a private investigator\. You might have become an adventurer as part of your next big mystery, but likely it was due to the consequences or aftermath of a prior case\./, "Resolviste delitos como inspector de policía o bien aceptaste trabajos de clientes ricos como investigador privado. Podrías haberte convertido en aventurero como parte de tu próximo gran misterio, pero probablemente fuera debido a las consecuencias o al desenlace de un caso anterior."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in the Society skill and the Underworld Lore skill\. You gain the Streetwise skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sociedad y Saber (bajos fondos). Obtienes la dote de habilidad Callejeo."],
            [/You dedicated yourself to intense training and rigorous study to become a great warrior\. The school you attended might have been a traditionalist monastery, an elite military academy, or the local branch of a prestigious mercenary organization\./, "Te has dedicado a un entrenamiento intenso y a un estudio riguroso para convertirte en un gran guerrero. La escuela a la que asististe pudo haber sido un monasterio tradicionalista, una academia militar de élite o la rama local de una prestigiosa organización mercenaria."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in your choice of the Acrobatics or Athletics skill\. You gain a skill feat: Cat Fall if you chose Acrobatics or Quick Jump if you chose Athletics\. You’re also trained in the Warfare Lore skill\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado, a tu elección, en la habilidad Acrobacias o Atletismo. Obtienes una dote de habilidad: Caída de gato si has elegido Acrobacias o Salto veloz si has elegido Atletismo. También estás entrenado en la habilidad Saber (guerra)."],
            [/As a diplomat or messenger, you traveled to lands far and wide\. Communicating with new people and forming alliances were your stock and trade\./, "Como diplomático o mensajero, has viajado por todas partes. Comunicarte con gente nueva y tejer alianzas eran tus puntos fuertes."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Society skill and a Lore skill related to one city you’ve visited often\. You gain the Multilingual skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Sociedad y en una habilidad de Saber relacionada con una ciudad que has visitado a menudo. Obtienes la dote de habilidad Multilingüe."],
            [/In an isolated place—like a cave, remote oasis, or secluded mansion—you lived a life of solitude\. Adventuring might be a welcome reprieve from solitude or an unwanted change, but in either case, you’re likely still rough around the edges\./, "En un lugar aislado, como por ejemplo una cueva, un oasis remoto o una mansión solitaria, llevaste una vida de soledad. Las aventuras podrían representar un alivio temporal a la soledad o un cambio no deseado, pero en cualquier caso, lo más probable es que seas muy poco sofisticado."],
            [/Choose two attribute boosts\. One must be to Constitution or Intelligence, and one is a free attribute boost\. You’re trained in the Nature or Occultism skill, plus a Lore skill related to the terrain you lived in as a hermit \(such as Cave Lore or Desert Lore\)\. You gain the Dubious Knowledge skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Naturaleza u Ocultismo, y además una habilidad de Saber relacionada con el terreno en el que viviste como ermitaño (como por ejemplo Saber [cuevas] o Saber [desierto]). Obtienes la dote de habilidad Conocimiento dudoso."],
            [/You have a knack for learning and sequestered yourself from the outside world to learn all you could\. You read about so many wondrous places and things in your books, always dreaming about one day seeing the real things\. Eventually, that curiosity led you to leave your studies and become an adventurer\./, "Se te da muy bien aprender y pasaste mucho tiempo apartado del mundo exterior para aprender todo lo posible. Leíste acerca de tantos lugares y cosas maravillosos en tus libros, que siempre soñaste con verlos algún día en la realidad. Por último, la curiosidad te condujo a abandonar los estudios y convertirte en aventurero."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in your choice of the Arcana, Nature, Occultism, or Religion skill, and gain the Assurance skill feat in your chosen skill\. You’re also trained in the Academia Lore skill\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado a elegir (una) entre las habilidades Arcanos, Naturaleza, Ocultismo o Religión, y obtienes la dote de habilidad Seguro en la habilidad elegida. También estas entrenado en la habilidad Saber (académico)."],
            [/The bloody games of the arena taught you the art of combat\. Before you attained true fame, you departed—or escaped—the arena to explore the world\. Your skill at drawing both blood and a crowd’s attention pay off in a new adventuring life\./, "Los sangrientos juegos de la arena te enseñaron el arte del combate. Antes de llegar a la verdadera fama te marchaste (o huiste) de la arena para explorar el mundo. Tu habilidad en hacer brotar la sangre y en atraer la atención de una multitud te resultan muy útiles en tu nueva vida de aventuras."],
            [/Choose two attribute boosts\. One must be to Strength or Charisma, and one is a free attribute boost\. You’re trained in the Performance skill and the Gladiatorial Lore skill\. You gain the Impressive Performance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Interpretar y Saber (gladiadores). Obtienes la dote de habilidad Interpretación impresionante."],
            [/You eked out a living by picking pockets on the streets of a major city, never knowing where you’d find your next meal\. While some adventure for the glory, you do so to survive\./, "Te ganabas (muy poco) la vida vaciando bolsillos en las calles de una gran ciudad, sin saber dónde ibas a encontrar tu siguiente comida. Si bien algunos se van de aventuras en busca de la gloria, tú lo hiciste para sobrevivir."],
            [/Choose two attribute boosts\. One must be to Dexterity or Constitution, and one is a free attribute boost\. You’re trained in Thievery and a Lore skill for the city you lived in as a street urchin \(such as Absalom Lore or Magnimar Lore\)\. You gain the Pickpocket skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en Latrocinio y en una habilidad de Saber relativa a la ciudad en la que viviste como golfillo (como por ejemplo Saber [Absalom] o Saber [Magnimar]). Obtienes la dote de habilidad Carterista."],
            [/You served in the guard, out of either patriotism or the need for coin\. Either way, you know how to get a difficult suspect to talk\. However you left the guard, you might think of adventuring as a way to use your skills on a wider stage\./, "Serviste en la guardia, o bien por patriotismo, o bien por la necesidad de ganarte la vida. De una forma u otra, sabes cómo hacer hablar a un sospechoso difícil. Dejaras la guardia por el motivo que la dejaras, podrías pensar que las aventuras son una forma de utilizar tus habilidades en un escenario mayor."],
            [/Choose two attribute boosts\. One must be to Strength or Charisma, and one is a free attribute boost\. You’re trained in the Intimidation skill and the Legal Lore or Warfare Lore skill\. You gain the Quick Coercion skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Intimidación y Saber (legal) o Saber (guerra). Obtienes la dote de habilidad Intimidación rápida."],
            [/As a formally trained apothecary or a rural practitioner of folk medicine, you learned the healing properties of various herbs\. You’re adept at collecting the right natural cures in all sorts of environments and preparing them properly\./, "Como boticario formalmente entrenado o practicante rural de la medicina popular, averiguaste las propiedades curativas de las diversas hierbas. Estas acostumbrado a recolectar las curas naturales adecuadas en todo tipo de entorno y prepararlas correctamente."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Nature skill and the Herbalism Lore skill\. You gain the Natural Medicine skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Naturaleza y Saber (herboristería). Obtienes la dote de habilidad Medicina natural."],
            [/The thrill of the win drew you into games of chance\. This might have been a lucrative sideline that paled in comparison to the real risks of adventuring, or you might have fallen on hard times due to your gambling and pursued adventuring as a way out of a spiral\./, "La excitación de ganar te atrajo a los juegos de azar. Podría haberse tratado de un negocio secundario que palideció en comparación a los riesgos reales de las aventuras, o bien podrías haber pasado momentos difíciles debido al juego y haberte dedicado a las aventuras como forma de salir de dicha espiral."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Deception skill and the Games Lore skill\. You gain the Lie to Me skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Engaño y Saber (juego). Obtienes la dote de habilidad Miénteme."],
            [/With a strong back and an understanding of seasonal cycles, you tilled the land and tended crops\. Your farm could have been razed by invaders, you could have lost the family tying you to the land, or you might have simply tired of the drudgery, but at some point, you became an adventurer\./, "Con una fuerte espalda y una comprensión de los ciclos estacionales, arabas la tierra y te ocupabas de las cosechas. Tu granja pudo haber sido arrasada por unos invasores, pudiste haber perdido la familia que te vinculaba a la tierra o simplemente te pudiste haber cansado del trabajo, pero en algún momento te convertiste en aventurero."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Athletics skill and the Farming Lore skill\. You gain the Assurance skill feat with Athletics\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (agricultura). Con el Atletismo obtienes la dote de habilidad Seguro."],
            [/Piles of legal manuals, stern teachers, and experience in the courtroom have instructed you in legal matters\. You’re capable of mounting a prosecution or defense in court, and you tend to keep abreast of local laws, as you never know when you might need to know them on short notice\./, "Montones de manuales de jurisprudencia, profesores austeros y mucha experiencia en los tribunales te han instruido en los asuntos legales. Eres capaz de organizar una acusación o una defensa en un tribunal y tiendes a estar al día de las leyes locales, puesto que nunca se puede decir cuándo vas a necesitar dicho conocimiento a corto plazo."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Legal Lore skill\. You gain the Group Impression skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (legal). Obtienes la dote de habilidad Impresión de grupo."],
            [/You are incredibly knowledgeable, skilled, and perhaps even trained to teach children and adults about the world and its wonders\. From books to classes, you’re committed to imparting knowledge to all\. Not everything can be taught or learned from a book, though, so you’ve become an adventurer to learn subjects more directly and bring that wisdom back to your students\./, "Eres increíblemente culto, hábil y quizás incluso estás entrenado en enseñar a los niños y a los adultos acerca del mundo y de sus maravillas. De los libros a las clases, estás dedicado a impartir el conocimiento a todos. Sin embargo, no todo se puede enseñar o aprender a partir de un libro, por lo que te has convertido en aventurero para aprender temas de forma más directa y transmitir dicha sabiduría a tus alumnos."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in your choice of either the Performance or Society skill, as well as the Academia Lore skill\. You gain the Experienced Professional skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado a elegir entre las habilidades Interpretar y Sociedad, así como en la habilidad Saber (académico). Obtienes la dote de habilidad Profesional experto."],
            [/Creating all sorts of minor inventions scratches your itch for problem-solving\. Your engineering skills take a particularly creative bent, and no one knows what you’ll come up with next\. It might be a genius device with tremendous potential or it might explode\./, "Crear todo tipo de inventos menores sacia tu sed de resolución de problemas. Tus habilidades para la ingeniería tienen una deriva particularmente creativa y nadie es capaz de decir con qué saldrás la próxima vez. Podría tratarse de un artilugio genial con un potencial tremendo… o podría explotar."],
            [/Choose two attribute boosts\. One must be to Dexterity or Intelligence, and one is a free attribute boost\. You’re trained in the Crafting skill and the Engineering Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (ingeniería). Obtienes la dote de habilidad Especialidad artesana."],
            [/You heard the call of the sea from a young age\. Perhaps you signed onto a merchant’s vessel, joined the navy, or even fell in with a crew of pirates and scalawags\./, "Oíste la llamada del mar desde muy temprana edad. Quizá te enrolaste en un mercante, te alistaste en la marina o incluso te uniste a una tripulación de piratas y de maleantes."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in the Athletics skill and the Sailing Lore skill\. You gain the Underwater Marauder skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (navegar). Obtienes la dote de habilidad Merodeador subacuático."],
            [/In the chaotic rush of battle, you learned to adapt to rapidly changing conditions as you administered to battle casualties\. You patched up soldiers, guards, or other combatants, and learned a fair amount about the logistics of war\./, "En el caótico ajetreo de la batalla, aprendiste a adaptarte a condiciones rápidamente cambiantes mientras atendías a las bajas. Apañaste a soldados, guardias u otros combatientes y aprendiste bastante acerca de la logística de la guerra."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Medicine skill and the Warfare Lore skill\. You gain the Battle Medicine skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Medicina y Saber (guerra). Obtienes la dote de habilidad Medicina de guerra."],
            [/In a dusty shop, market stall, or merchant caravan, you bartered wares for coin and trade goods\. The skills you picked up still apply in the adventuring life, in which a good deal on a suit of armor could prevent your death\./, "Despachabas mercancías a cambio de dinero (o las intercambiabas) en una tienda polvorienta, puesto de mercado o caravana de mercaderes. Las habilidades que aprendiste las sigues aplicando en la vida de aventurero, donde haber conseguido un buen trato en una armadura podría prevenir tu muerte."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Mercantile Lore skill\. You gain the Bargain Hunter skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (mercantil). Obtienes la dote de habilidad Buscador de gangas."],
            [/You earned a living wrenching precious minerals from the lightless depths of the earth\. Adventuring might have seemed lucrative or glamorous compared to this backbreaking labor— and if you have to head back underground, this time you plan to do so armed with a real weapon instead of a miner’s pick\./, "Te ganabas la vida arrancando minerales preciosos de las profundidades sin luz de la tierra. Las aventuras pueden haberte parecido lucrativas o sofisticadas, comparadas con tan agotadora tarea y, si tienes que volver bajo tierra, esta vez piensas hacerlo provisto de una arma real en lugar de un pico de minero."],
            [/Choose two attribute boosts\. One must be to Strength or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Mining Lore skill\. You gain the Terrain Expertise skill feat with underground terrain\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (minería). Obtienes la dote de habilidad Experiencia en un terreno con el terreno subterráneo."],
            [/To the common folk, the life of a noble seems one of idyllic luxury, but growing up as a noble or member of the aspiring gentry, you know the reality: a noble’s lot is obligation and intrigue\. Whether you seek to escape your duties by adventuring or to better your station, you have traded silks and pageantry for an adventurer’s life\./, "Para la gente común, la vida de un noble puede parecer un lujo idílico, pero tras crecer como noble o como aspirante a la nobleza conoces la realidad: el destino de un noble es la obligación y la intriga. Tanto si buscas escapar de tus deberes mediante las aventuras como si quieres mejorar tu estatus, has cambiado la pompa y el boato por la vida de aventurero."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Society skill and your choice of the Genealogy Lore or Heraldry Lore skill\. You gain the Courtly Graces skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sociedad y a elegir entre Saber (genealogía) y Saber (heráldica). Obtienes la dote de habilidad Gracia cortesana."],
            [/Traveling far and wide, you picked up basic tactics for surviving on the road and in unknown lands, getting by with few supplies and even fewer comforts\. As an adventurer, you travel still, often into even more dangerous places\./, "Viajando por todo lo largo y ancho del mundo, has acumulado tácticas básicas para sobrevivir por los caminos y las tierras desconocidas, aprendiendo a subsistir con pocos suministros y aún menos comodidades. Como aventurero, sigues viajando, a menudo a lugares incluso más peligrosos."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and a Lore skill related to one terrain you traveled in \(such as Desert Lore or Swamp Lore\)\. You gain the Assurance skill feat with Survival\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Supervivencia y además en una habilidad de Saber relacionada con un terreno al que viajaste (como por ejemplo Saber [desierto] o Saber [pantano]). Obtienes la dote de habilidad Seguro con Supervivencia."],
            [/You have been imprisoned or punished for crimes \(whether you were guilty or not\)\. Now that your sentence has ended or you’ve escaped, you take full advantage of the newfound freedom of your adventuring life\./, "Puedes haber estado preso por algún delito (siendo culpable o no). Ahora que tu sentencia ha acabado o has huido, te aprovechas al máximo de la recién estrenada libertad de tu vida como aventurero."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Stealth skill and the Underworld Lore skill\. You gain the Experienced Smuggler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sigilo y Saber (bajos fondos). Obtienes la dote de habilidad Contrabandista experto."],
            [/You were \(or still are\) a member of a cult whose rites may involve sacred dances to ensure a strong harvest or dire rituals that call upon dark powers\. You might have taken up adventuring to further your cult’s aims, to initiate yourself into the world’s grander mysteries, or to flee unsavory practices or strictures\./, "Eras (o sigues siendo) miembro de una secta cuyos ritos podrían implicar danzas sagradas para asegurar una buena cosecha o tremebundos rituales que llaman a los poderes oscuros. Podrías haberte dedicado a las aventuras para hacer avanzar los objetivos de tu secta, para iniciarte en los misterios mayores del mundo o para huir de prácticas o de exigencias poco agradables."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Occultism skill, and a Lore skill related to your deity or cult\. You gain the Schooled in Secrets skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Ocultismo y en una habilidad de Saber relacionada con tu dios o tu secta. Obtienes la dote de habilidad Instruido en secretos."],
            [/You have always felt a connection to animals, and it was only a small leap to learn to train them\. As you travel, you continuously encounter different creatures, befriending them along the way\./, "Siempre has notado una conexión con los animales y te costó un esfuerzo mínimo aprender a entrenarlos. Cuando viajas, te encuentras continuamente con diferentes criaturas, haciéndote amigo de ellas por el camino."],
            [/Choose two attribute boosts\. One must be to Wisdom or Charisma, and one is a free attribute boost\. You’re trained in the Nature skill and a Lore skill related to one terrain inhabited by animals you like \(such as Plains Lore or Swamp Lore\)\. You gain the Train Animal skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Sabiduría o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Naturaleza y en una habilidad de Saber relacionada con un terreno habitado por los animales que te gustan (como Saber [llanuras] o Saber [pantanos]). Obtienes la dote de habilidad Adiestrar animal."],

            // class descriptions
            [/You are a master of artistry, a scholar of hidden secrets, and a captivating persuader\. Using powerful performances, you influence minds and elevate souls to new levels of heroics\. You might use your powers to become a charismatic leader, or perhaps you might instead be a counselor, manipulator, scholar, scoundrel, or virtuoso\. While your versatility leads some to consider you a beguiling ne-erdo- well and a jack-of-all-trades, it's dangerous to dismiss you as a master of none\./, "Eres un maestro del arte, un erudito de los secretos ocultos y un persuasor que cautiva. Utilizando poderosas interpretaciones, influencias las mentes y elevas las almas a nuevos niveles de heroísmo. Podrías utilizar tus poderes para convertirte en un líder carismático o quizá en su lugar ser un consejero, un manipulador, un erudito, una sabandija o un virtuoso. Si bien tu versatilidad lleva a algunos a considerarte como un vago cautivador y una persona que hace de todo, es peligroso suponer que no dominas nada."],
            [/You command powerful magic, not through study or devotion to any ideal, but as a vessel or agent for a mysterious, otherworldly patron that even you don't entirely understand\. This entity might be a covert divinity, a powerful fey, a manifestation of natural energies, an ancient spirit, or any other mighty supernatural being—but its nature is likely as much a mystery to you as it is to anyone else\. Through a special familiar, your patron grants you versatile spells and powerful hexes to use as you see fit, though you're never certain if these gifts will end up serving your patron's larger plan\./, "Detentas el poder de una magia poderosa, no gracias al estudio ni a la devoción a un ideal, sino por ser el recipiente o el agente de un misterioso patrón de otro mundo al que ni siquiera tú comprendes del todo. Puede tratarse de un dios encubierto, una hada poderosa, un espíritu ancestral o cualquier otro ser sobrenatural omnipotente, pero probablemente su naturaleza es un misterio tanto para ti como para cualquier otro. A través de un familiar especial, tu patrón te concede conjuros versátiles y maleficios poderosos para utilizar a tu antojo, aunque nunca estás seguro de si simplemente estás sirviendo a un plan a gran escala de tu patrón."],
            [/Deities work their will upon the world in infinite ways, and you serve as one of their most stalwart mortal servants\. Blessed with divine magic, you live the ideals of your faith, adorn yourself with the symbols of your church, and train diligently to wield your deity's favored weapon\. Your spells might protect and heal your allies, or they might punish foes and enemies of your faith, as your deity wills\. Yours is a life of devotion, spreading the teachings of your faith through both word and deed\./, "Los dioses obran su voluntad sobre el mundo de infinitas formas y tú eres uno de sus servidores mortales más firmes. Bendecido con la magia divina, vives los ideales de tu fe, te adornas con los símbolos de tu Iglesia y te entrenas de forma diligente para empuñar el arma predilecta de tu dios. Tus conjuros podrían proteger y curar a tus aliados o castigar a tus adversarios y a los enemigos de tu fe, según la voluntad de tu dios. La tuya es una vida de devoción, extendiendo las enseñanzas de tu fe tanto de palabra como de obra."],
            [/The power of nature is impossible to resist\. It can bring ruin to the stoutest fortress in minutes, reducing even the mightiest works to rubble, burning them to ash, burying them beneath an avalanche of snow, or drowning them beneath the waves\. It can provide endless bounty and breathtaking splendor to those who respect it - and an agonizing death to those who take it too lightly\. You are one of those who hear nature's call\. You stand in awe of the majesty of its power and give yourself over to its service\./, "El poder de la Naturaleza es imposible de resistir. Es capaz de reducir a escombros la más recia de las fortalezas, convirtiendo en ruinas incluso sus baluartes más resistentes, dejándolos en cenizas, enterrándolos bajo una avalancha de nieve o ahogándolos bajo las olas. Puede proporcionar un botín infinito y un esplendor impresionante a quienes la respetan… y una muerte agónica a quienes se la toman a la ligera. Eres uno de los que oyen la llamada de la Naturaleza. Contemplas embelesado la majestad de su poder y te pones a su servicio."],
            [/Some rangers believe civilization wears down the soul, but still needs to be protected from wild creatures\. Others say nature needs to be protected from the greedy, who wish to tame its beauty and plunder its treasures\. You could champion either goal, or both\. You might be a scout, tracker, or hunter of fugitives or beasts, haunting the edge of civilization or exploring the wilds\. You know how to live off the land and are skilled at spotting and taking down both opportune prey and hated enemies\./, "Algunos exploradores creen que la civilización desgasta el alma, pero que aun así tiene que ser protegida de las criaturas salvajes. Otros dicen que la Naturaleza debe ser protegida de los avariciosos, que quieren domesticar su belleza y saquear sus tesoros. Puedes ser un campeón de uno de los dos objetivos, o de ambos. Puedes ser un batidor, un rastreador o un cazador de fugitivos o de bestias, acechando en la linde de la civilización o explorando las tierras vírgenes. Sabes cómo vivir del terreno y eres hábil en divisar y en abatir, tanto a las presas de oportunidad como a los enemigos más odiados."],
            [/Fighting for honor, greed, loyalty, or simply the thrill of battle, you are an undisputed master of weaponry and combat techniques. You combine your actions through clever combinations of opening moves, finishing strikes, and counterattacks whenever your foes are unwise enough to drop their guard. Whether you are a knight, mercenary, sharpshooter, or blade master, you have honed your martial skills into an art form and perform devastating critical attacks on your enemies./, "Tanto si luchas por honor, por avaricia, por lealtad o simplemente por la emoción de la batalla, eres un maestro indiscutible de las armas y de las técnicas de combate. Combinas tus acciones mediante una mezcla inteligente de movimientos de abertura, golpes de remate y contraataques siempre que tus enemigos son lo suficientemente incautos como para bajar la guardia. Ya seas un caballero, un mercenario, un francotirador o un maestro de la espada, has refinado tus habilidades marciales en una forma de arte que te permite llevar a cabo devastadores ataques críticos contra tus enemigos."],
            [/You are an eternal student of the secrets of the universe, using your mastery of magic to cast powerful spells\. You treat magic like a science, cross-referencing the latest texts on practical spellcraft with ancient tomes to discover and understand arcane magic\. Yet magical theory is vast, and there's no way you can study it all\. Most wizards learn through formal schooling, with their curriculum informing a specific rubric, although particularly driven researchers sometimes piece together their own theories\./, "Eres un alumno eterno de los secretos arcanos del universo y utilizas tu dominio de la magia para lanzar potentes conjuros. Tratas la magia como una ciencia, cruzando referencias entre los últimos textos sobre lanzamiento práctico de conjuros y antiguos tomos para descubrir y entender cómo funciona la magia arcana. Aun así, la teoría mágica es vasta y no hay forma de estudiarla en su totalidad. La mayoría de los magos aprenden a través de una educación formal y su currículo informa una rúbrica específica, aunque a veces, algunos investigadores particularmente motivados reúnen por sí solos sus propias teorías."],
            [/You are skilled and opportunistic\. Using your sharp wits and quick reactions, you take advantage of your opponents’ missteps and strike where it hurts most\. You play a dangerous game, seeking thrills and testing your skills, and likely don’t care much for any laws that happen to get in your way\. While the path of every rogue is unique and riddled with danger, the one thing you all share in common is the breadth and depth of your skills\./, "Eres hábil y oportunista. Utilizando tu aguda inteligencia y tus rápidas reacciones, sacas partido de los pasos en falso de tu oponente y pegas donde más duele. Tu juego es peligroso, buscando emociones y poniendo a prueba tus habilidades sin que probablemente te preocupen demasiado las leyes que se interpongan en tu camino. Si bien la senda de cada pícaro es única y está salpicada de peligros, lo que tenéis todos en común es la amplitud y la profundidad de vuestras habilidades."],

            // class feature descriptions
            [/You remain alert to threats around you. Your proficiency rank for Perception increases to expert./, "Permaneces alerta a las amenazas que te rodean. Tu rango de competencia para Percepción se incrementa a experto."],
            [/You’ve learned how to dodge while wearing light or no armor. Your proficiency ranks for light armor and unarmored defense increase to expert./, "Has aprendido a esquivar llevando armadura ligera o sin llevar armadura. Tus rangos de competencia con las armaduras ligeras y la defensa sin armaduras se incrementan a experto."],
            [/You’ve learned how to inflict greater injuries with your weapons. You deal 2 additional damage with weapons and unarmed attacks in which you are an expert. This damage increases to 3 if you’re a master, and to 4 if you’re legendary./, "Has aprendido a infligir heridas mayores con tus armas. Infliges 2 daño adicional con las armas y los ataques sin armas en los que dispones del rango experto. Este daño se incrementa a 3 si dispones del rango maestro y a 4 si dispones del rango legendario."],
            [/You’ve learned how to inflict greater injuries with the weapons you know best. You deal 2 additional damage with weapons and unarmed attacks in which you’re an expert. This damage increases to 3 if you’re a master, and 4 if you’re legendary./, "Has aprendido a infligir heridas mayores con las armas que conoces mejor. Infliges 2 daño adicional con las armas y los ataques sin arma en los que tienes el rango experto. Este daño se incrementa a 3 si dispones del rango maestro y a 4 si dispones del legendario."],
            [/You inflict greater injuries with the weapons you know best. You deal 2 additional damage with weapons and unarmed attacks in which you’re an expert. This damage increases to 3 if you’re a master, and 4 if you’re legendary./, "Infliges mayores heridas con las armas que conoces mejor. Infliges 2 daño adicional con las armas y los ataques sin arma en los que tienes el rango experto. Este daño se incrementa a 3 si dispones del rango maestro y a 4 si dispones del legendario."],
            [/You inflict great injuries with the weapons you know best\. You deal 2 additional damage with weapons and unarmed attacks in which you are an expert\. This damage increases to 3 if you’re a master, and to 4 if you’re legendary\./, "Infliges heridas más graves con las armas que mejor conoces. Infliges 2 daño adicional con las armas y los ataques sin armas en los que dispones del rango experto. Este daño se incrementa a 3 si dispones del rango maestro y a 4 si dispones del rango legendario."],
            [/Your damage from weapon specialization increases to 4 with weapons and unarmed attacks in which you’re an expert, 6 if you’re a master, and 8 if you’re legendary./, "Tu daño procedente de especialización en armas se incrementa a 4 con las armas y los ataques sin arma en los que tienes el rango experto, 6 si tienes el rango maestro y 8 si tienes el rango legendario."],
            [/You’ve learned to defend yourself better against attacks. Your proficiency ranks for light armor, medium armor, and unarmored defense increase to expert./, "Has aprendido a defenderte mejor contra los ataques. Tus rangos de competencia para armadura ligera, armadura intermedia y defensa sin armadura se incrementan a experto."],
            [/Your skill with light armor improves, increasing your ability to dodge blows. Your proficiency ranks for light armor and unarmored defense increase to master./, "Tu habilidad con la armadura ligera mejora, incrementando tu capacidad para esquivar los golpes. Tu rango de competencia para la armadura ligera y la defensa sin armas se incrementa a maestro."],
            [/You are a consummate spellcaster, blending both arcane theory and practical spellcraft. Your proficiency ranks for spell attack modifier and spell DC increase to legendary./, "Eres un lanzador de conjuros consumado, mezclando tanto la teoría arcana como el lanzamiento de conjuros práctico. Tus rangos de competencia para tus modificadores a los ataques de conjuro y tu CD de conjuros se incrementan a legendario."],
            [/Hex Cantrips Hex cantrips are special hexes that don’t cost Focus Points, so you can cast them as often as you like, though you can still use only one hex each turn\. Hex cantrips are in addition to the cantrips you choose with witch spellcasting and aren’t counted toward your prepared cantrips\. You gain a hex cantrip determined by your choice of patron\./, "Los trucos de maleficio son maleficios especiales, que no cuestan Puntos de Foco, por lo que podrás lanzarlos con la frecuencia que quieras, aunque sólo puedes lanzar uno por asalto. Los de maleficio se suman a los trucos que eliges con tu lanzamiento de conjuros de brujo y no cuentan contra el total de tus trucos preparados. Obtienes un truco de maleficio determinado por tu elección de patrón."],
            [/As a favored agent of your patron, you can invoke their power for a more direct magical intervention\. A hex is a spell shaped by your patron and sent to you through your familiar, rather than an ability you use directly\. Your patron expects you to advance its interests and does not take kindly to repeated requests for aid; as such, you can use only one hex each turn, and any attempts to use a second hex on that turn fail and the actions are lost\./, "Como agente favorito de tu patrón, puedes invocar su poder para conseguir una intervención mágica más directa. Un maleficio es un conjuro moldeado por tu patrón y enviado a ti a través de tu familiar, y no de una aptitud que usas directamente. Tu patrón espera que hagas avanzar sus intereses y no le gusta recibir peticiones de ayuda repetidas; por lo tanto, sólo puedes utilizar 1 maleficio por turno y cualquier intento de usar un segundo maleficio dicho turno falla, perdiéndose la acción."],
            [/Hex spells are a type of focus spell. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity to commune with your familiar./, "Los maleficios son un tipo de conjuro de foco. Cuesta 1 Punto de Foco lanzar un conjuro de foco y empiezas con una reserva de 1 Punto de Foco. Rellenas tu reserva de foco durante tus preparativos diarios y puedes recuperar 1 Punto de Foco invirtiendo 10 minutos utilizando la actividad Reenfocar para entrar en comunión con tu familiar."],
            [/Focus spells are automatically heightened to half your level rounded up, much like cantrips. Focus spells don’t require spell slots, and you can’t cast them using spell slots. Certain feats give you more focus spells. The maximum Focus Points your focus pool can hold is equal to the number of focus spells you have, but it can never be more than 3 points./, "Los conjuros de foco se potencian automáticamente a la mitad de tu nivel redondeado hacia arriba, de forma muy parecida a los trucos. Los conjuros de foco no requieren espacios de conjuro, y no se pueden lanzar utilizando espacios de conjuro. Ciertas dotes te conceden más conjuros de foco. La cantidad máxima de Puntos de Foco que puede albergar tu reserva es igual al número de conjuros de foco que tienes, pero nunca puede ser superior a 3 puntos."],
            [/You learn your choice of the patron’s puppet hex or phase familiar hex, which let you command your familiar or defend it from harm, respectively. You learn most other hexes from witch lessons./, "Puedes elegir entre los maleficios marioneta del patrón o familiar en fase, que te permiten comandar a tu familiar o defenderlo del daño, respectivamente. Aprendes la mayoría de otros maleficios de las lecciones de brujo."],
            [/When your patron first makes contact, they usually reveal little more of themself than glimpses or specific manifestations—you might see eyes from the shadows of the forest or hear a wordless voice echoing across the frozen tundra before your familiar makes itself known\. Your patron’s true identity might be a powerful hag, a fey lord, a deity or demigod, an archdevil, or a similarly powerful entity, or perhaps multiple such figures working in tandem, but that identity is for you to attempt to discover as you learn more of your patron’s lessons\. Some patrons are multifaceted, appearing in different guises, and granting different powers to different witches\. In some cases, the witch may know of their patron’s identity, but have some other aspect shrouded in uncertainty; they might know their patron’s name but not motive, or perhaps even if they know the patron’s identity, they have been cursed to never reveal it to others\./, "Cuando tu patrón se pone en contacto contigo por vez primera, suele revelar poco más de sí mismo que atisbos de manifestaciones específicas; podrías ver ojos desde las sombras del bosque u oír una voz sin palabras que resuena a través de la tundra helada antes de que tu familiar se dé a conocer. La auténtica identidad de tu patrón podría ser una poderosa saga, un señor de las hadas, un dios o un semidiós, un archidiablo o un ser similarmente poderoso, o quizá múltiples figuras de ese tipo trabajando en tándem, pero dicha identidad eres tú quien ha de intentar descubrirla, conforme averiguas más cosas acerca de las lecciones de tu patrón. Algunos patrones son polifacéticos, apareciendo bajo disfraces diferentes y concediendo poderes diferentes a brujos diferentes. En algunos casos, el brujo puede conocer la identidad de su patrón, pero algún otro aspecto puede estar aún envuelto en la incertidumbre; podría conocer el nombre de su patrón pero no sus motivaciones o quizá incluso si conoce la identidad del patrón, ha sido maldecido para no revelarla jamás a otros."],
            [/Your patron determines the following./, "Tu patrón determina lo siguiente."],
            [/Using your familiar as a conduit, your patron provides you the power to cast spells\. You are a spellcaster, and you can cast spells of your patron’s tradition using the Cast a Spell activity\. As a witch, when you cast spells, your incantations might rhyme, your gestures might be as simple as an ominous pointing finger or a complex folk sign, and your familiar might even echo your words or movements slightly as your patron’s magic surges\./, "Utilizando tu familiar como conducto, tu patrón te proporciona el poder de lanzar conjuros. Eres un lanzador de conjuros que puedes lanzar los de la tradición de tu patrón, mediante la actividad Lanzar un conjuro. Como brujo, cuando lanzas conjuros tus encantamientos podrían rimar, tus gestos podrían ser tan sencillos como señalar ominosamente con el dedo o hacer un complejo signo popular y tu familiar podría incluso hacerse eco de tus palabras o movimientos ligeramente conforme se activa la magia de tu patrón."],
            [/Depending on your deity, their sanctification can make you holy or unholy. This gives you the holy or unholy trait, which commits you to one side of a struggle over the souls of the planes and may be referenced in other abilities. If you "can be" holy or unholy according to your deity, you make that choice, and if you "must be" holy or unholy you gain the trait automatically. If you gain the opposing trait in some way, you lose the previous trait until you complete an atone ritual./, "Dependiendo de tu dios, su santificación te puede hacer sagrado o sacrílego. Eso te concede el rasgo sagrado o sacrílego, que te coloca en uno de los bandos de una lucha sobre las almas de los Planos y que puede verse referenciada en otras aptitudes. Si \"puedes ser\" sagrado o sacrílego según tu dios, tú eres quien hace la elección y si \"tienes que ser\" sagrado o sacrílego, obtienes el rasgo de forma automática. Si de alguna forma obtienes el rasgo opuesto, pierdes el anterior hasta completar un ritual de expiar."],
            [/Acts fundamentally opposed to your deity’s ideals are anathema to your faith. Learning or casting spells, committing acts, and using items that are anathema to your deity remove you from your deity’s good graces./, "Los actos fundamentalmente opuestos a los ideales de tu dios se consideran anatemas para tu fe. Aprender o lanzar conjuros, cometer actos y usar objetos que son anatema para tu dios hacen que caigas en desgracia ante el mismo."],
            [/Casting spells with the unholy trait is almost always anathema to deities who don’t allow unholy sanctification, and casting holy spells is likewise anathema to those who don’t allow holy sanctification. Similarly, casting spells that are anathema to the tenets or goals of your faith could interfere with your connection to your deity. For example, casting a spell to create undead would be anathema to the goddess of death. Many actions that are anathema don’t appear in any deity’s formal list. For borderline cases, you and your GM determine which acts are anathema./, "Lanzar conjuros con el rasgo sacrílego es casi siempre anatema para los dioses que no permiten la santificación sacrílega, de la misma forma que lanzar conjuros sagrados es anatema para los que no permiten la santificación sagrada. Similarmente, lanzar conjuros que son anatema para los principios u objetivos de tu fe podría interferir con la conexión con tu dios. Por ejemplo, lanzar un conjuro para crear muertos vivientes sería anatema para la diosa de la muerte. Muchas acciones que son anatema no aparecen en ninguna lista formal del dios. Para los casos límite, el DJ y tú deberéis determinar qué actos son anatema."],
            [/If you perform enough acts that are anathema to your deity, you lose the magical abilities that come from your connection to your deity. The class features that you lose are determined by the GM, but they likely include your divine font and all cleric spellcasting. These abilities can be regained only if you repent by conducting an atone ritual./, "Si llevas a cabo suficientes actos que son anatema para tu dios, pierdes las aptitudes mágicas que derivan de tu conexión con el mismo. Los rasgos de clase que pierdes los determina el DJ, pero probablemente incluyen tu fuente divina y todo el lanzamiento de conjuros de clérigo. Estas aptitudes sólo se pueden recuperar si te arrepientes llevando a cabo un ritual de expiar."],
            [/You are a cleric of the cloth, focusing on divine magic and your connection to your deity’s domains./, "Eres un clérigo con sotana, que se centra en la magia divina y en la conexión con los dominios de tu dios."],
            [/First Doctrine \(1st\): You gain the Domain Initiate cleric feat\./, "Primera doctrina (1.º): obtienes la dote de clérigo Iniciado de un dominio"],
            [/Second Doctrine \(3rd\): Your proficiency rank for Fortitude saves increases to expert\./, "Segunda doctrina (3º): tu rango de competencia para las salvaciones de Fortaleza se incrementa a experto."],
            [/Third Doctrine \(7th\): Your proficiency ranks for the spell \nattack modifier and spell DC statistics increase to expert./, "Tercera doctrina (7.º): tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango experto."],
            [/Fourth Doctrine \(11th\): You gain expert proficiency with your deity’s favored weapon, simple weapons and unarmed attacks\. When you critically succeed at an attack roll using your deity's favored weapon, you apply the weapon’s critical specialization effect; use your divine spell DC if necessary\./, "Cuarta doctrina (11.º): obtienes competencia a rango experto con el arma predilecta de tu dios, las armas sencillas y los ataques sin armas. Cuando obtienes un éxito crítico en una tirada de ataque utilizando el arma predilecta de tu dios, aplicas el efecto de especialización crítica de la misma; puedes utilizar tu CD de conjuros en lugar de tu CD de clase."],
            [/Fifth Doctrine \(15th\): Your proficiency ranks for the spell attack modifier and spell DC statistics increase to master\./, "Quinta doctrina (15.º): tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango maestro."],
            [/Final Doctrine \(19th\): Your proficiency ranks for the spell attack modifier and spell DC statistics increase to legendary\./, "Doctrina final (19.º): tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango legendario."],
            [/You have trained in the more militant doctrine of your church, focusing on both spells and battle./, "Te has entrenado en las doctrinas más militantes de tu Iglesia, centrándote tanto en los conjuros como en la batalla."],
            [/First Doctrine \(1st\): You’re trained in light and medium armor, and you have expert proficiency in Fortitude saves\. You gain the Shield Block general feat, a reaction to reduce damage with a shield\. If your deity’s weapon is simple or an unarmed attack, you gain the Deadly Simplicity cleric feat\. At 13th level, if you gain the divine defense class feature, you also gain expert proficiency in light and medium armor\./, "Primera doctrina (1.º): tienes competencia a rango entrenado en armadura ligera e intermedia y competencia a rango experto en las salvaciones de Fortaleza. Obtienes la dote general Bloqueo con el escudo, una reacción para reducir el daño mediante un escudo. Si el arma predilecta de tu dios es un arma sencilla o un ataque sin armas, obtienes la dote de clérigo Simplicidad mortal. A 13.er nivel, si obtienes el rasgo de clase defensa divina, también obtienes competencia a rango experto con las armaduras ligeras e intermedias."],
            [/Second Doctrine \(3rd\): You’re trained in martial weapons\./, "Segunda doctrina (3º): estás entrenado en armas marciales."],
            [/Third Doctrine \(7th\):You gain expert proficiency with your deity’s favored weapon, martial weapons, simple weapons, and unarmed attacks\. When you critically succeed at an attack roll using your deity’s favored weapon, you apply the weapon’s critical specialization effect; you can use your spell DC in place of your class DC\./, "Tercera doctrina (7.º): obtienes competencia a rango experto con el arma predilecta de tu dios, las armas marciales, las armas sencillas y los ataques sin armas. Cuando obtienes un éxito crítico en una tirada de ataque utilizando el arma predilecta de tu dios, aplicas el efecto de especialización crítica de la misma; puedes utilizar tu CD de conjuros en lugar de tu CD de clase."],
            [/Fourth Doctrine \(11th\): Your proficiency ranks for the spell attack modifier and spell DC statistics increase to expert\./, "Cuarta doctrina (11.º): tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango experto."],
            [/Fifth Doctrine \(15th\): Your proficiency rank for Fortitude saves increases to master\. When you roll a success at a Fortitude save, you get a critical success instead\./, "Quinta doctrina (15.º): tu rango de competencia para las salvaciones de Fortaleza se incrementa a maestro. Cuando consigues un éxito en una salvación de Fortaleza, en su lugar consigues un éxito crítico."],
            [/Final Doctrine \(19th\): You gain master proficiency with your deity’s favored weapon, spell attack modifier, and spell DC\./, "Doctrina final (19.º): obtienes competencia a rango maestro con el arma predilecta de tu dios, tu modificador al ataque de conjuros y tu CD de conjuro."],
            [/Through your deity’s blessing, you gain additional spells that channel either the life force called vitality or its counterforce, the void. When you prepare your spells each day, you can prepare additional heal or harm spells, depending on your deity. Once you choose, you can’t change your choice short of divine intervention./, "Mediante la bendición de tu dios, obtienes conjuros adicionales que canalizan, o bien la fuerza vital llamada vitalidad, o bien su contraria, el vacío. Cuando preparas tus conjuros cada día, puedes preparar conjuros adicionales de curar o de dañar, dependiendo de tu dios. El conjuro de fuente divina que te proporciona tu dios está indicado en la entrada Fuente divina del mismo en las págs. 35 a 39; si se indican ambos, puedes elegir entre curar y dañar. Una vez eliges, no puedes cambiar lo elegido salvo intervención divina."],
            [/You gain 4 additional spell slots each day at your highest rank of cleric spell slots. You can prepare only harm spells in these slots. At 5th level, the number of additional slots increases to 5, and at 15th level, the total number of additional slots increases to 6./, "Obtienes 4 espacios de conjuro adicionales cada día a tu rango mayor de espacios de conjuro de clérigo. En dichos espacios tan solo puedes preparar conjuros de dañar. A 5.º nivel, el número de espacios adicionales se incrementa a 5 y, a 15.º nivel, el número total de espacios adicionales se incrementa a 6."],
            [/You gain 4 additional spell slots each day at your highest rank of cleric spell slots. You can prepare only heal spells in these slots. At 5th level, the number of additional slots increases to 5, and at 15th level, the total number of additional slots increases to 6./, "Obtienes 4 espacios de conjuro adicionales cada día a tu rango mayor de espacios de conjuro de clérigo. En dichos espacios tan solo puedes preparar conjuros de curar. A 5.º nivel, el número de espacios adicionales se incrementa a 5 y, a 15.º nivel, el número total de espacios adicionales se incrementa a 6."],
            [/Even among followers of the same deity, approaches vary. At 1st level, you select cloistered cleric or warpriest and gain the benefits of its first doctrine. At 3rd level and every four levels thereafter, you gain another benefit from your doctrine./, "Incluso entre seguidores del mismo dios, las aproximaciones varían. A 1.er nivel seleccionas clérigo de clausura o sacerdote de guerra y obtienes los beneficios de su primera doctrina. A 3.er nivel y cada 4 niveles posteriores, obtienes otro beneficio de tu doctrina."],
            [/Your deity bestows on you the power to cast divine spells. You are a spellcaster, and you can cast spells of the divine tradition using the Cast a Spell activity. As a cleric, your chants generally invoke your deity and their powerful servants by name or title, while your gestures are followed by sacred symbols or other representations of your deity/, "Tu dios te concede el poder de lanzar conjuros divinos. Eres un lanzador de conjuros, y puedes lanzar conjuros de la tradición divina utilizando la actividad Lanzar un conjuro. Como clérigo, tus cánticos suelen invocar a tu dios y a sus sirvientes más poderosos por su nombre o por su título, mientras que tus gestos son seguidos por símbolos sagrados u otras representaciones de tu dios."],
            [/As a cleric, you are a mortal servitor of a deity you revere above all others. Your deity grants you the trained proficiency rank in one skill and with the deity’s favored weapon. If the favored weapon is uncommon, you also get access to that weapon./, "Como clérigo, eres un servidor mortal de un dios al que adoras por encima de todos los demás. Tu dios te concede el rango de competencia entrenado en una habilidad y con su arma predilecta. Aunque el arma predilecta de tu dios sea poco común, obtendrás acceso a dicha arma."],
            [/Your deity also adds spells to your spell list. You can prepare these just like you can any spell on the divine spell list once you can prepare spells of their rank as a cleric. Any of these spells that aren’t normally on the divine list are still divine spells if you prepare them this way./, "Tu dios también añade conjuros a tu lista. Podrás prepararlos igual que cualquier conjuro de la lista de conjuros divinos una vez puedas preparar conjuros de dicho rango como clérigo. Algunos de estos conjuros no figuran normalmente en la lista divina, pero siguen siendo conjuros divinos si los preparas de esta forma."],
            [/Your proficiency rank for Fortitude saves increases to expert./, "Tu rango de competencia para las salvaciones de Fortaleza se incrementa a experto."],
            [/Your proficiency ranks for the spell attack modifier and spell DC statistics increase to expert./, "Tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango experto."],
            [/Your proficiency rank for Fortitude saves increases to master\. When you roll a success at a Fortitude save, you get a critical success instead\./, "Tu rango de competencia para las salvaciones de Fortaleza se incrementa a maestro. Cuando consigues un éxito en una salvación de Fortaleza, en su lugar consigues un éxito crítico."],
            [/You gain master proficiency with your deity’s favored weapon, spell attack modifier, and spell DC\./, "Obtienes competencia a rango maestro con el arma predilecta de tu dios, tu modificador al ataque de conjuros y tu CD de conjuro."],
            [/You’re trained in martial weapons\./, "Estás entrenado en armas marciales."],
            [/You gain expert proficiency with your deity’s favored weapon, martial weapons, simple weapons, and unarmed attacks\. When you critically succeed at an attack roll using your deity’s favored weapon, you apply the weapon’s critical specialization effect; you can use your spell DC in place of your class DC\./, "Obtienes competencia a rango experto con el arma predilecta de tu dios, las armas marciales, las armas sencillas y los ataques sin armas. Cuando obtienes un éxito crítico en una tirada de ataque utilizando el arma predilecta de tu dios, aplicas el efecto de especialización crítica de la misma; puedes utilizar tu CD de conjuros en lugar de tu CD de clase."],
            [/Belief provides a bulwark against insidious thoughts. Your proficiency rank for Will saves increases to master. When you roll a success at a Will save, you get a critical success instead./, "Tus creencias te proporcionan un baluarte contra los pensamientos insidiosos. Tu rango de competencia para las salvaciones de Voluntad se incrementa a maestro. Cuando consigues un éxito en una salvación de Fortaleza, en su lugar consigues un éxito crítico."],
            [/You gain expert proficiency with your deity’s favored weapon, simple weapons and unarmed attacks\. When you critically succeed at an attack roll using that weapon, you apply the weapon’s critical specialization effect; use your divine spell DC if necessary\./, "Obtienes competencia a rango experto con el arma predilecta de tu dios, las armas sencillas y los ataques sin armas. Cuando obtienes un éxito crítico en una tirada de ataque utilizando el arma predilecta de tu dios, aplicas el efecto de especialización crítica de la misma; puedes utilizar tu CD de conjuros en lugar de tu CD de clase."],
            [/Your training and your deity protect you from harm. Your proficiency rank in unarmored defense increases to expert./, "Tu entrenamiento y tu dios te protegen del daño. Tu rango de competencia para la defensa sin armadura se incrementa a experto."],
            [/Your proficiency ranks for the spell attack modifier and spell DC statistics increase to master./, "Tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango maestro."],
            [/Your proficiency ranks for the spell attack modifier and spell DC statistics increase to legendary./, "Tus rangos de competencia para el modificador al ataque de conjuros y las CD de conjuros se incrementan a rango legendario."],
            [/You’re exalted by your deity and gain truly incredible spells\. You gain a single 10th-rank spell slot and can prepare a spell in that slot using cleric spellcasting\. Unlike with other spell slots, you can’t use 10-rank slots with abilities that give you more spell slots or that let you cast spells without expending spell slots\. You don’t gain more 10th-rank spells as you level up, but you can take the Maker of Miracles feat to gain a second slot\./, "Has sido exaltado por tu dios y obtienes conjuros auténticamente sensacionales. Obtienes un solo espacio de conjuro de 10.º rango y puedes preparar en él un conjuro utilizando lanzamiento de conjuros de clérigo. A diferencia de otros espacios de conjuro, no puedes utilizar espacios de 10.º rango con aptitudes que te conceden más espacios de conjuro o que te permiten lanzar conjuros sin gastar espacios de conjuro. No obtienes más conjuros de 10.º rango conforme subes de nivel, pero puedes adquirir la dote Obrador de milagros para conseguir un segundo espacio de conjuro."],
            [/Upon becoming a druid, you align yourself with a druidic order, which grants you a class feat, an order spell \(see below\), and an additional trained skill tied to your order\. While you’ll always be a member of your initial order, it’s not unheard of for a druid to request to study with other orders in search of greater understanding of the natural world, and PC druids are among the most likely to blend the powers of different orders\./, "Al convertirte en druida te alineas con una orden druídica, que te concede una dote de clase, un conjuro de orden (ver más abajo) y una habilidad adicional a rango entrenado, vinculada con tu orden. Si bien siempre serás miembro de tu orden inicial, no es inaudito que un druida decida estudiar con otras órdenes en busca de una mayor comprensión del mundo natural y los PJs druidas son de los que más se suelen prestar a mezclar los poderes de diferentes órdenes."],
            [/You have a strong connection to beasts, always feeling like you understood them \(and they you\) better than your own people\. You stand for the animals of nature, a powerful animal companion at your side\./, "Tienes una fuerte conexión con las bestias y siempre sientes que las entiendes (y ellas a ti) mejor que a tu propia gente. Representas a los animales de la Naturaleza, con un poderoso compañero animal a tu lado."],
            [/You revere the bounty of nature, acting as both a gardener and warden for the wilderness\. With your leshy familiar at your side, you help areas regrow after disasters or negligent expansion and turn flora against those who would abuse them\./, "Adoras la abundancia de la Naturaleza, actuando como jardinero y como custodio de las tierras vírgenes. Con tu familiar leshy a tu lado, ayudas a que las áreas vuelvan a crecer después de un desastre o de una expansión negligente y vuelves la flora contra quienes abusarían de ella."],
            [/Whether you were born under a tempest or survived a bolt of lightning from a clear blue sky, you now carry the fury of the storm in your heart, channeling thunder to terrifying destructive effect and riding the winds through the air\./, "Tanto si naciste durante una tempestad como si sobreviviste a un rayo caído de un cielo nocturno despejado, ahora llevas en tu corazón la furia de la tormenta, canalizando el trueno con un efecto terroríficamente destructivo y cabalgando los vientos a través del aire."],
            [/The uncontrollable call of the natural world courses through your body\. You might have been raised by a wild animal, or you might have come to reject the artifices of cities after growing up in one\. Now, primal magic grants you the ability to wear the form of an untamed creature\./, "La llamada salvaje e incontrolable del mundo natural recorre tu cuerpo. Podrías haber sido criado por un animal salvaje o haber llegado a rechazar los artificios de las ciudades tras haber crecido en una de ellas. Ahora, la magia primigenia te concede la aptitud de revestir la forma de una criatura salvaje."],
            [/Order spells are a type of focus spell\. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point\. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity to commune with local nature spirits or otherwise tend to the wilderness in a way befitting your order\./, "Los conjuros de orden son un tipo de conjuro de foco. Cuesta 1 Punto de Foco lanzar un conjuro de foco y empiezas con una reserva de 1 Punto de Foco. Repones tu reserva de foco durante tus preparativos diarios y puedes recuperar 1 Punto de Foco invirtiendo 10 minutos y utilizando la actividad Reenfocar para entrar en comunión con los espíritus de la Naturaleza locales o atender a las tierras vírgenes de alguna otra forma compatible con tu orden."],
            [/Focus spells are automatically heightened to half your level rounded up, much like cantrips\. Focus spells don’t require spell slots, and you can’t cast them using spell slots\. Certain feats give you more focus spells\. The maximum Focus Points your focus pool can hold is equal to the number of focus spells you have, but can never be more than 3 points\./, "Los conjuros de foco se potencian automáticamente a la mitad de tu nivel redondeado hacia arriba, de forma muy parecida a los trucos. Los conjuros de foco no requieren espacios de conjuro, y no se pueden lanzar utilizando espacios de conjuro. Ciertas dotes te conceden más conjuros de foco. El máximo de Puntos de Foco que tu reserva puede albergar es igual al número de conjuros de foco de que dispones, pero nunca puede ser mayor que 3 puntos. "],
            [/As stewards of the natural order, druids find affronts to nature anathema\. If you repeatedly perform these acts, you lose your magical abilities from the druid class, including your druid spellcasting and the benefits of your order\. These abilities can be regained only if you demonstrate your repentance with an atone ritual\. The following acts are anathema to all druids\./, "Como senescales del mundo natural, los druidas consideran los anatemas como afrentas a la Naturaleza. Si llevas a cabo dichas acciones de forma repetitiva, pierdes tus aptitudes mágicas de la clase druida, incluyendo tu lanzamiento de conjuros de druida y los beneficios de tu orden. Éstas aptitudes sólo se pueden recuperar si demuestras tu arrepentimiento mediante un ritual de expiar. Los siguientes actos son anatema para todos los druidas."],
            [/Your choice of druidic order adds further anathema, as detailed in the order’s entry/, "Tu elección de orden de druida añade otros anatemas, tal y como se detalla en la entrada de la orden."],
            [/The power of the wild world flows through you\. You are a spellcaster and can cast spells of the primal tradition using the Cast a Spell activity \(see Casting Spells\)\. As a druid, your spellcasting incantations might be pleas to the environment around you or the invocation of ancient vows; your hands might sway like willows or curl into clawlike shapes as your gestures direct your magic\./, "El poder de las tierras vírgenes fluye a través de ti. Eres un lanzador de conjuros y puedes lanzar los de la tradición primigenia utilizando la actividad Lanzar un conjuro (ver Cómo lanzar conjuros en la pág. 299). Como druida, tus encantamientos para lanzar conjuros podrían ser apelaciones al entorno que te rodea o la invocación de antiguos votos; tus manos podrían moverse como las ramas de un sauce o curvarse en forma de garra mientras tus gestos dirigen tu magia."],
            [/At 1st level, you can prepare two 1st-rank spells and five cantrips each morning from the common spells on the primal spell list, or from other primal spells to which you gain access and learn via Learn a Spell\. Prepared spells remain available to you until you cast them or until you prepare your spells again\. The number of spells you can prepare each day is called your spell slots\./, "A 1.er nivel, cada mañana puedes preparar 2 conjuros de 1.er rango y 5 trucos de los conjuros comunes de la lista primigenia o de otros conjuros primigenios a los que obtienes acceso y aprendes vía Aprender un conjuro. Los conjuros preparados permanecen disponibles hasta que los lanzas o hasta que preparas conjuros de nuevo. El número de conjuros que puedes preparar cada día se denomina tus espacios de conjuro."],
            [/As you increase in level as a druid, the number of spells you can prepare each day increases, as does the highest rank of spell you can cast, as shown in the Druid Spells per Day table\./, "Conforme subes de nivel como druida, el número de conjuros que puedes preparar cada día aumenta, así como el rango superior de conjuros que puedes lanzar, tal y como se muestra en la tabla Conjuros de druida por día de la pág. 139."],
            [/Some of your spells require you to attempt a spell attack to see how effective they are, or have your enemies roll against your spell DC \(typically by attempting a saving throw\)\. Since your key attribute is Wisdom, your spell attack modifier and spell DC use your Wisdom modifier\./, "Algunos de tus conjuros requieren que hagas un ataque de conjuro para ver lo efectivos que son, o que tus enemigos tiren contra tu CD de conjuros (típicamente mediante una tirada de salvación). Como quiera que tu atributo clave es la Sabiduría, tu modificador al ataque de conjuros y tu CD de conjuros utilizan tu modificador por Sabiduría."],
            [/You gain your choice of the Animal Empathy or Plant Empathy druid feat\./, "Puedes elegir entre las dotes de druida Empatía animal o Empatía con las plantas."],
            [/You know the Wildsong, a secret language known only within druid orders, in addition to any languages you know through your ancestry\. The Wildsong is a melodic and tonal language sounding more like animal calls than a spoken tongue, and its alphabet involves fractals and spirals, like the arrangement of a seashell’s chambers, a snowflake’s crystals, or a fern’s fronds\. Teaching the Wildsong to non-druids is anathema\./, "Conoces la canción salvaje, un idioma secreto sólo conocido en los círculos druídicos, además de cualquier otro idioma derivado de tu ascendencia. La canción salvaje es un idioma melódico y tonal, que parece más sonidos de animales que una lengua hablada, y su alfabeto implica fractales y espirales, como la disposición de las cámaras de una concha marina, los cristales de un copo de nieve o las frondas de un helecho. Enseñar la canción salvaje a quienes no son druidas es un anatema."],
            [/Adventures have made your physique more hardy. Your proficiency rank for Fortitude saves increases to expert./, "Las aventuras te han hecho físicamente más resistente. Tu rango de competencia para las salvaciones de Fortaleza se incrementa a experto."],
            [/You’ve honed your ability to dodge dangers. Your proficiency rank for Reflex saves increases to expert./, "Has refinado tu capacidad para esquivar los peligros. Tu rango de competencia para las salvaciones de Reflejos se incrementa a experto."],
            [/Your command of primal forces has deepened, empowering your spells. Your proficiency ranks for spell attack modifier and spell DC increase to expert./, "Tu dominio de las fuerzas primigenias se ha hecho más profundo, potenciando tus conjuros. Tu rango de competencia para tu modificador a los ataques de conjuro y tu CD de conjuros se incrementan a experto."],
            [/You’ve improved your combat skill. Your proficiency rank for simple weapons and unarmed attacks increases to expert./, "Has mejorado tu habilidad de combate. Tu rango de competencia para los ataques con las armas sencillas y los ataques sin armas se incrementa a experto."],
            [/Your primal will, like that of the greatest beast, can’t be tamed. Your proficiency rank for Will saves increases to master. When you roll a success at a Will save, you get a critical success instead./, "Tu voluntad primigenia, como la de las mayores bestias, no puede ser domada. Tu rango de competencia para las salvaciones de Voluntad se incrementa a maestro. Cuando consigues un éxito en una salvación de Voluntad, en su lugar consigues un éxito crítico."],
            [/Primal magic answers your command\. Your proficiency ranks for spell attack modifier and spell DC increase to master\./, "La magia primigenia responde a tus órdenes. Tu rango de competencia para tu modificador a los ataques de conjuro y tu CD de conjuros se incrementan a maestro."],
            [/You have developed an unparalleled rapport with the magic of nature. Your proficiency ranks for spell attack modifier and spell DC increase to legendary./, "Has desarrollado una relación sin paralelo con la magia de la Naturaleza. Tus rangos de competencia para tus modificadores a los ataques de conjuro y tu CD de conjuros se incrementan a legendario."],
            [/You command the most potent forces of primal magic and can cast a spell of truly incredible power\. You gain a single 10th-rank spell slot and can prepare a spell in that slot using druid spellcasting\. Unlike with other spell slots, you can’t use 10-rank slots with abilities that give you more spell slots or that let you cast spells without expending spell slots\. You don’t gain more 10th-rank spells as you level up, but you can take the Hierophant’s Power feat to gain a second slot\./, "Tienes a tus órdenes las fuerzas más poderosas de la magia primigenia y puedes lanzar un conjuro de un poder auténticamente increíble. Obtienes un solo espacio de conjuro de 10.º rango en el que puedes preparar un conjuro utilizando lanzamiento de conjuros de druida. A diferencia de otros espacios de conjuro, no puedes utilizar espacios de 10.º rango con aptitudes que te conceden más espacios de conjuro o que te permiten lanzar conjuros sin gastar espacios de conjuro. No obtienes más conjuros de 10.º rango conforme subes de nivel, pero puedes adquirir la dote Poder del hierofante para obtener un segundo espacio."],
            [/You have trained to become a skilled hunter and tracker, gaining an extra benefit when you Hunt Prey depending on the focus of your training. Choose a hunter’s edge./, "Te has entrenado para convertirte en un cazador y rastreador hábil, lo que te concede un beneficio adicional cuando Persigues a tu presa dependiendo del enfoque de tu entrenamiento. Elige una ventaja del cazador."],
            [/You have trained to unleash a devastating flurry of attacks upon your prey\. Your multiple attack penalty for attacks against your hunted prey is –3 \(–2 with an agile attack\) on your second attack of the turn instead of –5, and –6 \(–4 with an agile attack\) on your third or subsequent attack of the turn, instead of –10\./, "Te has entrenado para desatar una devastadora ráfaga de ataques contra tu presa. Tu penalizador por ataque múltiple para los ataques contra tu presa perseguida es -3 (-2 con un arma ágil) en tu segundo ataque del turno en lugar de -5, y -6 (-4 con un arma ágil) en tu tercer ataque del turno (y siguientes) en lugar de -10."],
            [/You are talented at outwitting your prey\. You gain a \+1 circumstance bonus to AC against your prey’s attacks and a \+2 circumstance bonus to Deception checks, Intimidation checks, Stealth checks, and any checks to Recall Knowledge about the prey\./, "Tienes el talento de ser más listo que tu presa. Obtienes un bonificador +1 por circunstancia a la CA contra los ataques de tu presa y un bonificador +2 por circunstancia a las pruebas de Engaño, Intimidación, Sigilo y cualquier prueba para Recordar conocimiento acerca de la presa."],
            [/You have trained to aim for your prey’s weak points\. The first time you hit your hunted prey in a round, you also deal 1d8 additional precision damage\. \(Precision damage increases the damage you already deal, using the same type, but is ineffective against creatures that lack vital organs or weak points\.\) At 11th level, the extra damage increases to 2d8 precision damage, and at 19th level, the extra damage increases to 3d8 precision damage\./, "Te has entrenado para apuntar a los puntos débiles de tu presa. La primera vez que impactas a tu presa perseguida en un asalto, también le infliges 1d8 daño de precisión adicional (el daño de precisión incrementa el daño que infliges, utilizando el mismo tipo, pero no es efectivo contra criaturas que carecen de órganos vitales o puntos débiles). A 11.º nivel, el daño adicional se incrementa a 2d8 daño de precisión, y a 19.º nivel, se incrementa a 3d8 daño de precisión."],
            [/You designate a single creature as your prey and focus your attacks against that creature\. You must be able to see or hear the prey, or you must be tracking the prey during exploration\. You gain a \+2 circumstance bonus to Perception checks when you Seek your prey and a \+2 circumstance bonus to Survival checks when you Track your prey\. You also ignore the penalty for making ranged attacks within your second range increment against the prey you’re hunting\. You can have only one creature designated as your prey at a time\. If you use Hunt Prey against a creature when you already have a creature designated, the prior creature loses the designation and the new prey gains the designation\. Your designation lasts until your next daily preparations\./, "Designas a una sola criatura como presa y centras tus ataques en dicha criatura. Tienes que ser capaz de verla u oírla, o debes estarla rastreando durante la exploración. Obtienes un bonificador +2 por circunstancia a las pruebas de Percepción cuando Buscas a tu presa y un bonificador +2 por circunstancia a las pruebas de Supervivencia cuando Rastreas a tu presa. Ignoras también el penalizador por llevar a cabo ataques a distancia dentro de tu segundo incremento de rango de distancia contra la presa a la que persigues. Tan solo puedes tener una criatura designada como presa en un momento dado. Si utilizas Perseguir presa contra una criatura cuando ya tienes otra designada, la anterior pierde la designación, que va a parar a la nueva. Tu designación dura hasta tus siguientes preparativos diarios."],
            [/Your mental defenses grow stronger. Your proficiency rank for Will saves increases to expert./, "Tus defensas mentales se han hecho más fuertes. Tu rango de competencia para las salvaciones de Voluntad se incrementa a experto."],
            [/You gain every advantage from your weapons. Your proficiency rank for martial weapons, simple weapons, and unarmed attacks increases to expert. You gain access to the critical specialization effects of all such weapons and unarmed attacks when attacking your hunted prey./, "Obtienes todas las ventajas de tus armas. Tu rango de competencia para las armas marciales, las armas sencillas y los ataques sin arma se incrementa a experto. Obtienes acceso a los efectos de especialización crítica de todas esas armas y ataques sin arma cuando atacas a tu presa perseguida."],
            [/When you move through natural terrains, you are hard to track. You always gain the benefits of the Cover Tracks action in such terrains, without moving at half your Speed./, "Cuando atraviesas terrenos naturales, eres difícil de rastrear. Siempre obtienes los beneficios de la acción Cubrir huellas en dichos terrenos, sin tenerte que mover a la mitad de tu Velocidad."],
            [/You’ve honed your reflexes dodging falling trees and pounding hail. Your proficiency rank for Reflex saves increases to master. When you roll a success on a Reflex save, you get a critical success instead./, "Has refinado tus reflejos esquivando árboles que caían y tormentas de granizo. Tu rango de competencia para las salvaciones de Reflejos se incrementa a maestro. Cuando sacas un éxito en una salvación de Reflejos, en su lugar obtienes un éxito crítico."],
            [/You have highly developed acuity and attention to detail. Your proficiency rank for Perception increases to master./, "Has desarrollado una Percepción aguda y una gran atención al detalle. Tu rango de competencia para Percepción se incrementa a maestro."],
            [/You always find the weak points in your foes’ defenses when they’re on unfavorable terrain. Enemies are off-guard to you if they’re in difficult terrain./, "Siempre encuentras los puntos débiles de las defensas de tus enemigos cuando están en terreno desfavorable. Tus enemigos están desprevenidos ante ti si están en terreno difícil."],
            [/You’ve gained techniques that improve your cunning and skill. Your proficiency rank for your ranger DC increases to expert. If you have warden spells, your proficiency rank for spell attacks and spell DCs increases to expert./, "Has practicado técnicas que mejoran tu astucia y tu habilidad. Tu rango de competencia para tu CD de explorador se incrementa a experto. Si tienes conjuros de guardián, tu rango de competencia para los ataques de conjuro y para la CD de conjuro se incrementa a experto."],
            [/You move quickly through obstacles, whether they’re tumbled stone or tangled undergrowth. You can ignore the effects of difficult terrain. As normal for ignoring difficult terrain, this also lets you treat the hindrances of greater difficult terrain as those of difficult terrain./, "Atraviesas rápidamente los obstáculos, ya se trate de piedras amontonadas o de sotobosque espeso. Puedes ignorar los efectos del terreno difícil. Como es habitual para ignorar el terreno difícil, esto te permite tratar los obstáculos del terreno difícil mayor como si fuera terreno difícil a secas."],
            [/You shake off a grizzly’s grab or a poison’s ill effects with equal ease. Your proficiency rank for Fortitude saves increases to master. When you roll a success on a Fortitude save, you get a critical success instead./, "Te quitas de encima la presa de un oso pardo o los efectos dañinos de un veneno con la misma facilidad. Tu rango de competencia para las salvaciones de Fortaleza se incrementa a maestro. Cuando obtienes un éxito en una salvación de Fortaleza, en su lugar obtienes un éxito crítico."],
            [/You fully understand the intricacies of weapons. Your proficiency ranks for unarmed attacks, simple weapons, and martial weapons increase to master./, "Entiendes por completo las complejidades de las armas. Tu rango de competencia para los ataques sin armas, armas simples y armas marciales se incrementa a maestro."],
            [/You avoid explosions with reflexes a cat would envy. Your proficiency rank for Reflex saves increases to legendary. When you roll a critical failure on a Reflex save, you get a failure instead. When you fail a Reflex save against an effect that deals damage, you halve the damage you take./, "Evitas las explosiones con unos reflejos que serían la envidia de un gato. Tu rango de competencia para las salvaciones de Reflejos se incrementa a legendario. Cuando sufres un fallo crítico en una salvación de Reflejos, en su lugar sufres un fallo simple. Cuando fallas una salvación de Reflejos contra un efecto que inflige daño, reduces a la mitad el daño sufrido."],
            [/You notice the almost imperceptible. Your proficiency rank for Perception increases to legendary./, "Percibes aquello que es prácticamente imperceptible. Tu rango de competencia para la Percepción se incrementa a legendario."],
            [/You have honed your abilities as a hunter to incredible levels\. Your proficiency rank for your ranger class DC increases to master\. If you have warden spells, your proficiency rank for spell attacks and spell DCs increases to master\. When using a ranged weapon that you have master proficiency in, you can ignore the penalty if attacking your hunted prey within the weapon’s second and third range increments\./, "Has refinado tus aptitudes como cazador hasta niveles inconcebibles. Tu rango de competencia para la CD de tu clase explorador se incrementa a maestro. Si dispones de conjuros de guardián, tus rangos de competencia para ataques de conjuros y para la CD de conjuro se incrementan a maestro. Cuando usas un arma a distancia con la que tienes competencia a rango maestro, puedes ignorar el penalizador si atacas a tu presa perseguida dentro del segundo y el tercer incremento de rango de distancia."],
            [/If you have master proficiency in Perception, you gain a \+4 circumstance bonus to Perception checks when you Seek your prey, and if you have master proficiency in Survival, you gain a \+4 circumstance bonus to Survival checks when you Track your prey\./, "Si tienes competencia a rango maestro en Percepción, obtienes un bonificador +4 por circunstancia a las pruebas de Percepción cuando Buscas tu presa, y si tienes competencia a rango maestro en Supervivencia, obtienes un bonificador +4 por circunstancia a las pruebas de Supervivencia cuando Rastreas a tu presa."],
            [/You also gain an additional benefit depending on your hunter’s edge\./, "También obtienes un beneficio adicional que depende de tu ventaja del cazador."],
            [/You can blend your weapon mastery with skillful targeting to make a series of precise attacks\. If you have master proficiency with your weapon, your multiple attack penalty for attacks against your hunted prey is –2 \(–1 with an agile attack\) on your second attack of the turn, and –4 \(–2 with an agile attack\) on your third and subsequent attacks of the turn\./, "Puedes mezclar tu maestría con las armas y una puntería hábil para llevar a cabo una serie de ataques precisos. Si tienes competencia a rango maestro con tu arma, tu penalizador por ataque múltiple para los ataques contra tu presa perseguida es -2 (-1 con un arma ágil) en tu segundo ataque del turno, y -4 (-2 con un arma ágil) en tu tercer ataque del turno y ataques siguientes."],
            [/Your mastery of skills allows you to overwhelm your prey\. If you have master proficiency in Deception, Intimidation, Stealth, or the skill you use to Recall Knowledge about your prey, increase the circumstance bonus against the prey with that skill from \+2 to \+4\. If you have master proficiency with your armor, increase the circumstance bonus to AC against the prey from \+1 to \+2/, "Tu dominio de las habilidades te permite abrumar a tu presa. Si tienes competencia a rango maestro en Engaño, Intimidación, Sigilo o la habilidad que utilizas para Recordar conocimiento acerca de tu presa, incrementa de +2 a +4 el bonificador por circunstancia contra la misma con dicha habilidad. Si tienes competencia a rango maestro con tu armadura, incrementa de +1 a +2 el bonificador por circunstancia a la CA contra dicha presa."],
            [/Your weapon mastery allows you to hit your prey’s vital areas multiple times\. The second time in a round you hit your hunted prey, you also deal 1d8 precision damage\. At 19th level, your second hit in a round against your hunted prey deals 2d8 precision damage, and your third hit in a round against your hunted prey deals 1d8 precision damage\./, "Tu maestría con un arma te permite acertar en múltiples ocasiones en los puntos vitales de tu presa. La segunda vez en un asalto en la que aciertas a tu presa perseguida, le infliges además 1d8 daño de precisión. A 19.º nivel, tu segundo impacto en un asalto contra tu presa perseguida inflige 2d8 daño de precisión y el tercer impacto en un asalto contra tu presa perseguida inflige 1d8 daño de precisión."],
            [/Your skill with light and medium armor improves, increasing your ability to avoid blows. Your proficiency ranks for light and medium armor, as well as for unarmored defense, increase to master./, "Tu habilidad con las armaduras ligeras e intermedias mejora, incrementando tu capacidad de evitar los golpes. Tus rangos de competencia para armadura ligera, armadura intermedia y defensa sin armadura se incrementan a maestro."],
            [/You size up your prey with a glance. You can use Hunt Prey as a free action if it’s your first action of your turn./, "Le tomas la medida a tu presa de un vistazo. Puedes utilizar Perseguir presa como acción gratuita si es la primera acción de tu turno."],
            [/You lash out at a foe that leaves an opening. Make a melee Strike against the triggering creature. If your attack is a critical hit and the trigger was a manipulate action, you disrupt that action. This Strike doesn’t count toward your multiple attack penalty, and your multiple attack penalty doesn’t apply to this Strike./, "Fustigas a un enemigo que deja una abertura en sus defensas. Da un Golpe cuerpo a cuerpo contra la criatura desencadenante. Si tu ataque resulta en un impacto crítico y el desencadenante era una acción de manipular, interrumpes dicha acción. Este Golpe no cuenta contra tu penalizador por ataque múltiple y tu penalizador por ataque múltiple no se aplica a este Golpe."],
            [/Having faced countless foes and the chaos of battle, you have learned how to stand strong in the face of fear. Your proficiency rank for Will saves increases to expert. When you roll a success at a Will save against a fear effect, you get a critical success instead. In addition, anytime you gain the frightened condition, reduce its value by 1./, "Habiéndote enfrentado a incontables enemigos y al caos de la batalla, has aprendido a mantenerte firme frente al miedo. Tu rango de competencia para las salvaciones de Voluntad se incrementa a experto. Cuando consigues un éxito en una salvación de Voluntad contra un efecto de miedo, en su lugar obtienes un éxito crítico. Además, cada vez que se te inflige el estado asustado reduces en 1 su valor."],
            [/Hours spent training with your preferred weapons, learning and developing new combat techniques, have made you particularly effective with your weapons of choice. Choose one weapon group. Your proficiency rank increases to master with the simple weapons, martial weapons, and unarmed attacks in that group, and to expert with the advanced weapons in that group. You gain access to the critical specialization effects of all weapons and unarmed attacks for which you have master proficiency./, "Las horas pasadas entrenando con tus armas predilectas, aprendiendo y desarrollando nuevas técnicas de combate, te han hecho particularmente efectivo con las armas que prefieres. Elige un grupo de armas. Tu rango de competencia se incrementa a maestro con las armas sencillas, las armas marciales y los ataques sin arma de dicho grupo, y a experto con las armas avanzadas de dicho grupo. Obtienes acceso a los efectos de especialización crítica de todas las armas y ataques sin arma para los que tienes competencia a rango maestro."],
            [/Whether taking stock of an enemy army or simply standing guard, you excel at observing your foes\. Your proficiency rank for Perception increases to master\. In addition, you gain a \+2 circumstance bonus to Perception checks for initiative, making you faster to react during combat\./, "Ya se trate de evaluar un ejército enemigo o simplemente de montar guardia, sobresales en observar a tus enemigos. Tu rango de competencia para Percepción se incrementa a maestro. Además, obtienes un bonificador +2 por circunstancia a las pruebas de Percepción para la iniciativa, haciendo que seas más rápido en reaccionar durante el combate."],
            [/Your experience in battle helps protect you against magic and toxins alike\. Your proficiency rank for Fortitude saves increases to master\. When you roll a success on a Fortitude save, you get a critical success instead\./, "Tu experiencia en batalla te ayuda a protegerte tanto contra la magia como contra las toxinas. Tu rango de competencia para las salvaciones de Fortaleza se incrementa a maestro. Cuando obtienes un éxito en una salvación de Fortaleza, en su lugar obtienes un éxito crítico."],
            [/You can prepare your tactics to suit different situations\. When you make your daily preparations, you gain one fighter feat of 8th level or lower that you meet the prerequisites for and don’t already have\. You can use that feat until your next daily preparations\./, "Puedes preparar tus tácticas de forma que encajen en diferentes situaciones. Cuando llevas a cabo tus preparativos diarios, obtienes una dote de guerrero de 8.º nivel o menor, para la que cumples los prerrequisitos y que no tenías antes. Puedes utilizar dicha dote hasta tus siguientes preparativos diarios."],
            [/You have spent so much time in armor that you know how to make the most of its protection\. Your proficiency ranks for light, medium, and heavy armor, as well as for unarmored defense, increase to expert\. You gain the armor specialization effects of medium and heavy armor\./, "Has pasado tanto tiempo con una armadura puesta que sabes cómo sacar el máximo partido de la protección que te ofrece. Tus rangos de competencia para las armaduras ligera, intermedia y pesada, así como para la defensa sin armadura, se incrementan a rango experto. Obtienes los efectos de especialización en armadura para las armaduras intermedias y pesadas."],
            [/Your practiced techniques have made you even more formidable. Your proficiency rank for your fighter class DC increases to expert./, "Has practicado tus técnicas para hacerlas aún más formidables. Tu rango de competencia para tu CD de la clase guerrero aumenta a experto."],
            [/You’ve learned fighting techniques that apply to all armaments, and you’ve developed unparalleled skill with your favorite weapons\. Your proficiency ranks for simple weapons, martial weapons, and unarmed attacks increase to master\. Your proficiency rank for advanced weapons increases to expert\./, "Has aprendido técnicas de lucha que se aplican a todos los armamentos y has desarrollado una habilidad sin paralelo con tus armas predilectas. Tus rangos de competencia para las armas sencillas, las marciales y los ataques sin arma se incrementan a maestro. Tu rango de competencia para las armas avanzadas aumenta a experto."],
            [/You can select one weapon group and increase your proficiency ranks to legendary for all simple weapons, martial weapons, and unarmed attacks in that weapon group, and to master for all advanced weapons in that weapon group\./, "Puedes seleccionar un grupo de armas e incrementar tu rango de competencia a legendario para todas las armas sencillas, marciales y ataques sin armas en dicho grupo, y a rango maestro para todas las armas avanzadas de dicho grupo."],
            [/Your extensive experience gives you even greater ability to adapt to each day’s challenges\. When you use combat flexibility, you can gain two fighter feats instead of one\. While the first feat must still be 8th level or lower, the second feat can be up to 14th level, and you can use the first feat to meet the prerequisites of the second feat\. You must meet all of the feats’ prerequisites\./, "Tu extensa experiencia te concede una aptitud aún mayor para adaptarte a los desafíos de cada día. Cuando usas flexibilidad de combate, puedes obtener dos dotes de guerrero en lugar de una. Si bien la primera dote tiene que seguir siendo de 8.º nivel o inferior, la segunda puede ser hasta de 14.º nivel, y puedes utilizar la primera para cumplir los prerrequisitos de la segunda. Tienes que cumplir todos los prerrequisitos de la dote."],
            [/Practiced reflexes let you find safety even in the face of cataclysmic explosions\. Your proficiency rank for Reflex saves increases to master\. When you roll a success on a Reflex save, you get a critical success instead\./, "Unos reflejos practicados te permiten encontrar la seguridad, incluso frente a explosiones cataclísmicas. Tu rango de competencia para las salvaciones de Reflejos se incrementa a maestro. Cuando obtienes un éxito en una salvación de Reflejos, en su lugar obtienes un éxito crítico."],
            [/Your skill with armor improves further\. Your proficiency ranks for light, medium, and heavy armor, as well as for unarmored defense, increase to master\./, "Tu habilidad con la armadura mejora aún más. Tus rangos de competencia para las armaduras ligera, intermedia y pesada, así como para la defensa sin armadura, se incrementan a rango maestro."],
            [/You are nigh-unmatched with any weapon\. Your proficiency ranks for simple weapons, martial weapons, and unarmed attacks increase to legendary, and your proficiency rank for advanced weapons increases to master\. Your proficiency rank for your fighter class DC increases to master\./, "Eres prácticamente inigualable con cualquier arma. Tus rangos de competencia con las armas sencillas, las marciales y los ataques sin armas se incrementan a legendario y tu rango de competencia con las armas avanzadas se incrementa a maestro. Tu rango de competencia para tu CD de la clase guerrero aumenta a maestro."],
            [/During your studies to become a full-fledged wizard, you produced a thesis of unique magical research\. You gain a special benefit depending on the topic of your thesis research\. The arcane thesis topics presented in this book are below; your specific thesis probably has a much longer and more technical title like "On the Methods of Spell Interpolation and the Genesis of a New Understanding of the Building Blocks of Magic\."/, "Durante tus estudios para convertirte en mago, redactaste una tesis de investigación mágica única. Obtienes un beneficio especial dependiendo del tema de investigación de la misma. Los temas de las tesis arcanas presentados en este libro figuran a continuación; tu tesis específica probablemente tenga un título más largo y técnico como por ejemplo \"Acerca de los Métodos de Interpolación de Conjuros y la Génesis de una Nueva Comprensión de los Cimientos de la Magia\"."],
            [/Through dedicated study and practice, you can construct spells with academic rigor by shaping arcane magic. You are a spellcaster, and you can cast spells of the arcane tradition using the Cast a Spell activity. As a wizard, when you cast spells, your incantations likely specify exactly what forces you call on and how to shape them, and your gestures precisely shape and direct your magic while circles of arcane runes flare to life./, "A través del estudio dedicado y de la práctica, puedes construir conjuros con rigor académico dando forma a la magia arcana. Eres un lanzador de conjuros y puedes lanzarlos de la tradición arcana utilizando la actividad Lanzar un conjuro. Como mago, cuando lanzas conjuros, es probable que tus encantamientos especifiquen exactamente a qué fuerzas recurres y cómo las moldeas, y tus gestos dan forma y dirigen de forma precisa tu magia mientras círculos de runas arcanas cobran vida."],
            [/At 1st level, you can prepare up to two 1st-rank spells and five cantrips each morning from the spells in your spellbook \(see below\), as well as one extra curriculum cantrip and one extra curriculum spell of each rank you can cast from your arcane school\. Prepared spells remain available to you until you cast them or until you prepare your spells again\. The number of spells you can prepare is called your spell slots\./, "A 1.er nivel, puedes preparar hasta dos conjuros de 1.er rango y cinco trucos cada mañana de los que tienes en tu libro (ver a continuación), además de un truco adicional por currículo y un conjuro adicional por currículo de cada rango que puedes lanzar de tu escuela arcana. Los conjuros preparados permanecen disponibles hasta que los lanzas o hasta que preparas conjuros de nuevo. El número de conjuros que puedes preparar se denomina tus espacios de conjuro."],
            [/As you increase in level as a wizard, the number of spells you can prepare each day increases, as does the highest rank of spell you can cast./, "Conforme subes de nivel como mago, el número de conjuros que puedes preparar cada día se incrementa, así como el rango superior de conjuro que puedes lanzar."],
            [/Some of your spells require you to attempt a spell attack to see how effective they are, or have your enemies roll against your spell DC \(typically by attempting a saving throw\)\. Since your key attribute is Intelligence, your spell attack modifier and spell DC use your Intelligence modifier\./, "Algunos de tus conjuros requieren que hagas un ataque de conjuro para ver lo efectivos que son, o que tus enemigos tiren contra tu CD de conjuros (típicamente haciendo una tirada de salvación). Como quiera que tu atributo clave es la Inteligencia, tu modificador a los ataques de conjuro y tu CD de conjuros utilizan tu modificador por Inteligencia."],
            [/When you get spell slots of 2nd rank and higher, you can fill those slots with stronger versions of lower-rank spells. This increases the spell’s rank, heightening it to match the spell slot. Many spells have specific improvements when they are heightened to certain ranks./, "Cuando obtienes espacios de conjuro de 2.º rango y superior, puedes rellenarlos con versiones más potentes de conjuros de rango más bajo. Esto incrementa el rango de conjuro, potenciándolo para que encaje con el espacio de conjuro. Muchos conjuros obtienen mejoras específicas cuando se potencian a ciertos rangos."],
            [/Some of your spells are cantrips. A cantrip is a special type of spell that doesn’t use spell slots. You can cast a cantrip at will, any number of times per day. A cantrip is always automatically heightened to half your level rounded up— this is usually equal to the highest rank of wizard spell slot you have. For example, as a 1st-level wizard, your cantrips are 1st-rank spells, and as a 5th-level wizard, your cantrips are 3rd-rank spells./, "Algunos de tus conjuros se denominan trucos. Un truco es un tipo especial de conjuro que no utiliza espacios de conjuro. Puedes lanzar un truco a voluntad, todas las veces que quieras al día. Un truco se potencia siempre automáticamente a la mitad de tu nivel redondeado hacia arriba; esto suele ser igual al rango mayor de espacios de conjuro de mago de que dispones. Por ejemplo, cuando eres un mago de 1.er nivel, tus trucos son conjuros de 1.er rango, y cuando eres un mago de 5.º nivel, tus trucos son conjuros de 3.er rango."],
            [/Every arcane spell has a written version, which you record in your personalized book of spells. You start with a spellbook worth 10 sp or less, which you receive for free and must study each day to prepare your spells. Your spellbook’s form and name are up to you. It might be a musty, leather-bound tome or an assortment of thin metal disks connected to a brass ring; its name might be esoteric, like The Tome of Silent Shadows or something more academic, like Advanced Pyromantic Applications of Elemental Theory./, "Cada conjuro arcano tiene una versión escrita, que anotas en tu libro de conjuros personalizado. Empiezas con un libro de conjuros que vale 10 pp o menos, que obtienes gratis y que debes estudiar cada día para preparar tus conjuros. La forma y el nombre de tu libro de conjuros quedan a tu elección. Podría tratarse de un tomo mohoso encuadernado en cuero, o de un surtido de finos discos de metal conectados por una anilla de bronce; su nombre podría ser esotérico, como por ejemplo el Tomo de las Sombras Silenciosas o algo más académico como Aplicaciones Pirománticas Avanzadas de la Teoría Elemental Jalmeri."],
            [/The spellbook contains your choice of 10 arcane cantrips and five 1st-rank arcane spells\. You choose these from the common spells on the arcane spell list or from other arcane spells you gain access to\. You also add two 1st-rank spells from the curriculum of your arcane school \(except in the case of the school of unified magical theory, as described in that school\)\./, "El libro de conjuros contiene 10 trucos arcanos y 5 conjuros arcanos de 1.er rango a elegir por ti. Los eliges de entre los conjuros comunes de la lista de conjuros arcanos o de otros conjuros arcanos a los que puedes tener acceso. También añades dos conjuros de 1.er rango del currículo de tu escuela arcana (excepto en el caso de la Escuela de la Teoría Mágica Unificada, tal y como se describe en dicha escuela)."],
            [/Each time you gain a level, you add two arcane spells to your spellbook, of any spell rank for which you have spell slots, chosen from common spells of your tradition or others you gain access to. You can also add spells to your spellbook with the Learn a Spell activity. You can also add spells to your spellbook with the Learn a Spell activity./, "Cada vez que subes de nivel, añades estos conjuros arcanos a tu libro, de cualquier rango que puedes lanzar, elegidos de entre los conjuros comunes de tu tradición o de otros a los que obtienes acceso y aprendes vía Aprender un conjuro. Cuando obtienes espacios de conjuro de un nuevo rango, también añades un conjuro adicional del currículo de tu escuela (a menos que se trate de la escuela de la teoría mágica unificada)."],
            [/You theorize that spell slots are a shorthand for an underlying energy that powers all spellcasting, and you’ve found a way to tinker with the hierarchy of spell slots, combining them to fuel more powerful spells./, "Tienes la teoría de que los espacios de conjuro son una especie de taquigrafía para una energía subyacente que potencia todo lanzamiento de conjuros, y has encontrado la forma de manipular la jerarquía de dichos espacios, combinándolos para potenciar conjuros más poderosos."],
            [/During your daily preparations, you can trade two spell slots of the same spell rank for a bonus spell slot of up to 2 spell ranks higher than the traded spell slots. You can exchange as many spell slots as you have available. Bonus spell slots must be of a spell rank you can normally cast, and each bonus spell slot must be of a different spell rank. You can also trade any spell slot for two additional cantrips, though you can’t trade more than one spell slot at a time for additional cantrips in this way./, "Durante tus preparativos diarios, puedes intercambiar 2 espacios de conjuro del mismo rango por un espacio de conjuro adicional de hasta 2 rangos de conjuro superior a los intercambiados. Podrás intercambiar tantos espacios de conjuro como tengas disponibles. Los espacios de conjuro adicionales tienen que ser de un rango que puedes lanzar normalmente y cada uno de ellos debe ser de un rango diferente. También puedes intercambiar cualquier espacio de conjuro por 2 trucos adicionales, aunque de esta manera no puedes intercambiar a la vez más de 1 espacio de conjuros por trucos adicionales."],
            [/Your thesis posits that the magical practice of spellshaping can be realized more efficiently by altering variables and parameters as you cast, imitating the wizards of long ago who had to work out their own spells themselves. This allows you efficient access to various spellshape effects./, "Tu tesis postula que la práctica mágica del moldeo de conjuros se puede realizar de forma más eficiente alterando variables y parámetros conforme lanzas, imitando a los magos de hace mucho, que tenían que trabajar sus propios conjuros. Eso te permite un acceso eficaz a diversos efectos de moldeo de conjuros."],
            [/You gain one 1st-level spellshape wizard feat of your choice. Starting at 4th level, during your daily preparations, you can gain a spellshape wizard feat of your choice that has a level requirement of no more than half your level, which you can use until your next daily preparations./, "Obtienes una dote de mago de moldeo de conjuros de 1.er nivel a tu elección. Empezando a 4.º nivel, durante tus preparativos diarios, puedes obtener una dote de mago de moldeo de conjuros a tu elección con un requisito de nivel no superior a la mitad de tu nivel, que puedes utilizar hasta tus siguientes preparativos diarios."],
            [/Your thesis maintains that early and intense adoption of staves from the first days of study can create a symbiotic bond between spellcaster and staff, allowing them to create remarkable magic together. You’ve formed such a connection with a makeshift staff you built, and you are ready to infuse any staff you encounter with greater power. You begin play with a makeshift staff of your own invention. It has the magical trait and contains one cantrip and one 1st-rank spell, both from your spellbook. During your daily preparations, you can expend one spell to grant the staff a number of charges equal to that spell’s rank, which dissipate after 24 hours. While you are holding the staff, you can Cast the Spells it contains. The 1st-rank spell consumes 1 charge but the cantrip doesn’t require charges. If your staff is destroyed, you can create a new one over the course of 1 hour, though it has no charges./, "Tu tesis sostiene que la adopción temprana e intensa de los bastones desde los primeros días de estudio puede crear un vínculo simbiótico entre el lanzador de conjuros y el bastón, permitiéndoles crear juntos una magia más notable. Has formado una conexión de ese tipo con un bastón improvisado de tu creación, y estas listo para infundir cualquier bastón con el que te encuentras con un poder mayor. Empiezas el juego con un bastón improvisado de tu propia invención. Tiene el rasgo mágico y contiene un truco y un conjuro de 1.er rango, ambos de tu libro de conjuros. Durante tus preparativos diarios, puedes gastar un conjuro para conceder al bastón tantas cargas como el rango de dicho conjuro, que se disipan a las 24 horas. Mientras empuñas el bastón, puedes Lanzar los conjuros que contiene. El conjuro de 1.er rango consume 1 carga, pero el truco no requiere cargas."],
            [/During your daily preparations, you can merge your makeshift staff with another staff in your possession, adding the two chosen spells to it. This staff gains charges from preparing it and from expending spells./, "Puedes Elaborar tu bastón improvisado, convirtiéndolo en cualquier tipo de bastón mágico al precio normal del nuevo bastón, añadiendo los dos conjuros elegidos originalmente al bastón Elaborado. Dicho bastón obtiene cargas debido a su preparación además de los conjuros gastados."],
            [/At 8th level, you can expend two spells instead of one when preparing any staff, adding additional charges equal to the combined ranks of the expended spells. At 16th level, you can expend up to a total of three spells to add charges to the staff, adding additional charges equal to the combined ranks of all three spells. If your staff is destroyed, you can create a new one over the course of 1 hour, though it has no charges./, "A 8.º nivel, puedes gastar dos conjuros en lugar de uno mientras preparas cualquier bastón, añadiendo tantas cargas adicionales como los rangos combinados de los conjuros gastados. A 16.º nivel, puedes gastar hasta un total de tres conjuros para añadir cargas al bastón, añadiendo tantas cargas adicionales como los rangos combinados de los conjuros gastados."],
            [/You’ve long held that fine-tuning the magic that bonds a wizard and their familiar can improve the mystic connection and yield greater results, compared to the safe yet generic bond most wizards currently use. You’ve formed such a pact with your familiar, gaining more advantages from it than most wizards. You gain the Familiar wizard feat. Your familiar gains an extra ability, and it gains an additional extra ability when you reach 6th, 12th, and 18th levels./, "Llevas tiempo sosteniendo que sintonizar la magia que une un mago a su familiar puede mejorar la conexión mística y generar resultados mayores, comparado con el vínculo seguro pero genérico que la mayoría de los magos utiliza de forma habitual. Has cerrado un pacto de ese tipo con tu familiar, obteniendo más ventajas de él que la mayoría de los magos. Obtienes la dote de mago Familiar. Tu familiar obtiene una aptitud adicional, y otra cuando llegas a los niveles 6.º, 12.º y 18.º. Tu conexión con tu familiar altera tu rasgo de clase vínculo arcano de forma que almacenas tu energía mágica en tu familiar en lugar de en un objeto de tu propiedad; también obtienes la acción gratuita Drenar familiar en lugar de Drenar objeto vinculado. Drenar familiar se puede utilizar en cualquier momento en el que una aptitud te permitiría utilizar Drenar objeto vinculado y funciona igual, excepto que extraes la magia de tu familiar en lugar de extraerla de un objeto."],
            [/You don’t accept the fact that once spells are prepared, they can’t be changed until your next daily preparations, and you have uncovered a shortcut allowing you to substitute new spells for those you originally prepared./, "No aceptas el hecho de que una vez los conjuros han sido preparados, no los puedes cambiar hasta tus siguientes preparativos diarios, y has descubierto un atajo que te permite sustituir por nuevos conjuros los que preparaste originalmente."],
            [/You can spend 10 minutes to empty one of your prepared spell slots and prepare a different spell from your spellbook in its place. If you are interrupted during such a swap, the original spell remains prepared and can still be cast. You can try again to swap out the spell later, but you must start the process over again./, "Puedes invertir 10 minutos en vaciar uno de tus espacios de conjuro preparados y en su lugar preparar uno diferente a partir de tu libro de conjuros. Si te interrumpen durante el cambio, el conjuro original sigue preparado y sigue pudiéndose lanzar. Más tarde puedes intentar de nuevo el intercambio, pero debes iniciar el proceso otra vez."],
            [/You place some of your magical power in a bonded item. Each day when you prepare your spells, you can designate a single item you own as your bonded item. This is typically an item associated with spellcasting, such as a wand, ring, or staff, but you are free to designate a weapon or other item. You gain the Drain Bonded Item free action./, "Sitúas parte de tu poder mágico en un objeto vinculado. Cada día, cuando preparas tus conjuros, puedes designar un solo objeto en tu posesión como objeto vinculado. Se trata típicamente de un objeto asociado con el lanzamiento de conjuros, como una varita, anillo o bastón, pero eres libre de designar un arma u otro objeto. Obtienes la acción gratuita Drenar objeto vinculado."],
            [/You expend the magical power stored in your bonded item. During the current turn, you can cast one spell you prepared today and already cast, without spending a spell slot. You must still Cast the Spell and meet the spell’s other requirements./, "Gastas el poder mágico almacenado en tu objeto vinculado. Durante el turno actual, puedes lanzar un conjuro que preparaste hoy y ya lanzaste, sin gastar un espacio de conjuro. Aún sigues teniendo que Lanzar el conjuro y cumplir los demás requisitos de este."],
            [/You’ve developed a knack for dodging danger. Your proficiency rank for Reflex saves increases to expert./, "Tienes facilidad para esquivar el peligro. Tu rango de competencia para las salvaciones de Reflejos se incrementa a experto."],
            [/Extended practice of the arcane has improved your capabilities. Your proficiency ranks for spell attack modifier and spell DC increase to expert./, "La práctica extendida de las artes arcanas ha mejorado tus capacidades. Tu rango de competencia para tu modificador a los ataques de conjuro y tu CD de conjuros se incrementa a experto."],
            [/Magical power has improved your body’s resiliency. Your proficiency rank for Fortitude saves increases to expert./, "El poder mágico ha mejorado la resiliencia de tu cuerpo. Tu rango de competencia para las salvaciones de Fortaleza se incrementa a experto."],
            [/Through sheer experience, you’ve improved your technique with your weapons. Your proficiency ranks for simple weapons and unarmed attacks increase to expert./, "A través de la experiencia, has mejorado tu técnica con tus armas. Tus rangos de competencia para las armas sencillas y los ataques sin arma aumentan a experto."],
            [/The flow of magic and your training combine to help you avoid attacks. Your proficiency rank in unarmored defense increases to expert./, "El flujo de la magia y tu entrenamiento se combinan para ayudarte a evitar los ataques. Tu rango de competencia para la defensa sin armadura se incrementa a experto."],
            [/You’ve learned how to inflict greater injuries with the weapons you know best. You deal an additional 2 damage with weapons and unarmed attacks in which you are an expert. This damage increases to 3 if you’re a master, and 4 if you’re legendary./, "Has aprendido a infligir heridas mayores con las armas que conoces mejor. Infliges 2 daño adicional con las armas y los ataques sin arma en los que dispones del rango experto. El daño se incrementa a 3 si dispones del rango maestro y a 4 si dispones del rango legendario."],
            [/You command superlative spellcasting ability. Your proficiency ranks for spell attack modifier and spell DC increase to master./, "Tienes a tus órdenes una aptitud mágica superlativa. Tus rangos de competencia para tu modificador a los ataques de conjuro y tu CD de conjuros se incrementan a maestro."],
            [/Your mind is simply too complex and sophisticated to be tampered with. Your proficiency rank for Will saves increases to master. When you roll a success at a Will save, you get a critical success instead./, "Tu mente es simplemente demasiado compleja y sofisticada como para poderla manipular. Tu rango de competencia para las salvaciones de Voluntad se incrementa a maestro. Cuando consigues un éxito en una salvación de Fortaleza, en su lugar consigues un éxito crítico."],
            [/You command the most potent arcane magic and can cast a spell of truly incredible power. You gain a single 10th-rank spell slot and can prepare a spell in that slot using wizard spellcasting. Unlike with other spell slots, you can’t use 10th-rank slots with abilities that give you more spell slots or that let you cast spells without expending spell slots. You don’t gain more 10th-rank spells as you level up, but you can take the Archwizard’s Might feat to gain a second slot./, "Tienes a tus órdenes la magia arcana más poderosa y puedes lanzar un conjuro de un poder auténticamente sensacional. Obtienes un solo espacio de conjuro de 10.º rango en el que puedes preparar un conjuro utilizando lanzamiento de conjuros de mago. A diferencia de otros espacios de conjuro, no puedes utilizar los espacios de 10.º rango con aptitudes que te conceden más espacios de conjuro o que te permiten lanzar conjuros sin gastar espacios de conjuro. No obtienes más conjuros de 10.º rango cuando subes de nivel, pero puedes adquirir la dote Poder del archimago para obtener un segundo espacio."],
            [/Your arcane school is where you devoted yourself to the study of spellcraft. Whether you learned in the storied halls of a formal institution, via an apprenticeship with an archmage, or taught yourself from secondhand tomes, your arcane school indelibly set the curriculum and direction of your magic./, "Tu escuela arcana es donde te has dedicado al estudio del lanzamiento de conjuros. Tanto si has aprendido en los historiados salones de una institución formal, mediante un aprendizaje con un archimago o por tu propia cuenta a partir de tomos de segunda mano, tu escuela arcana ha fijado de forma indeleble el currículo y la dirección de tu magia."],
            [/Runes and wards, numbers and letters—they underpin all magic, making them the logical subject for a wizard who studies fundamental forces. Whether you’re lacing your words with magic to compel others, casting wards around your workshop, or destabilizing the very structure of an opponent’s spells, you know this unassuming school carries elegant power./, "Runas y custodias, números y letras; forman la base de toda la magia, convirtiéndolos en el tema lógico de un mago que estudia las fuerzas fundamentales. Tanto si entrelazas tus palabras con magia para obligar a otros, como si colocas custodias alrededor de tu taller, como si desestabilizas la propia estructura de los conjuros de un oponente, sabes que esta modesta escuela lleva consigo un elegante poder."],
            [/Magic is power, and there are always those who will use power for the art of battle. You may have studied in the military of a nation of the brink of war. You summon whirling energies that can lay waste to both soldiers and armies, while being sure not to neglect arcane countermeasures for common tactical complications or the shields and defenses that keep combatants alive on the battlefield./, "La magia es poder y siempre hay quienes utilizan dicho poder para el arte de la guerra. Puedes haber estudiado en el ejército de una nación al borde de la guerra. Convocas energías giratorias que pueden devastar tanto a soldados como ejércitos, mientras te aseguras de no olvidarte de las contramedidas arcanas para las complicaciones tácticas más comunes, o los escudos y las defensas que mantienen vivos a los combatientes en el campo de batalla."],
            [/Why use your magic to affect something as pedestrian as the physical world\? You’ve turned your magic past the Universe to the forces beyond, summoning spirits and shades, manipulating dimensions and planes, and treading in a place not meant for mortals\./, "¿Por qué utilizar tu magia para afectar algo tan pedestre como el mundo físico? Has redirigido tu magia más allá del universo hacia las fuerzas que hay más allá, convocando espíritus y formas, manipulando dimensiones y planos y pisando un lugar que no estaba pensado para los mortales."],
            [/You've learned that the fruits of arcane studies—like any other field—should ultimately help the common citizen. You’ve learned the humble art of construction, of finding lost people and things, of moving speedily among buildings and moats—yet these same arts can be turned to demolition, and the constructs you animate to build bridges can just as easily tear them down./, "Has aprendido que los frutos de los estudios arcanos (como cualquier otro campo) deberían acabar ayudando al ciudadano común. Has aprendido el humilde arte de la construcción, el de encontrar personas y cosas perdidas y el de moverte rápidamente entre edificios y fosos; sin embargo, esas mismas artes se pueden dedicar a la demolición, y los constructos a los que animas para construir puentes pueden destruirlos con idéntica facilidad."],
            [/As a scholar, you know all too well the importance of a sound mind. Thus, you attended a school that taught the arts of befuddling lesser minds with figments and illusions or implanted sensations and memories./, "Como erudito, conoces bien la importancia de una mente sana. Por lo tanto, acudiste a una facultad que enseña las artes de confundir a las mentes inferiores con fantasías e ilusiones o bien sensaciones y recuerdos implantados."],
            [/The uninitiated often think of wizards as cerebral, focused on their studies more than the body, yet your school of magic taught of the relationship between the two. Your magic focuses on the ways that living matter can be convinced into another shape for a time, allowing you to polymorph a seed into a vine, a human into a beast, or a harmless germ into a deadly toxin./, "Los no iniciados a menudo creen que los magos son cerebrales, y centrados en sus estudios más que en el cuerpo, pero tu escuela de magia enseña la relación entre ambas cosas. Tu magia se centra en las formas en que la materia viva puede ser convencida para adoptar otra forma durante un tiempo, permitiéndote polimorfar una semilla en un zarcillo, un humano en una bestia o un germen inofensivo en una toxina letal."],
            [/You eschew the idea that magic can be neatly expressed by the teachings of any single school or college, instead directing your self-study to pick up the best of every school of magic\. In doing so, you’ll find the truths that lie at the intersection of each school, coming closer to the ideal nature of arcane magic\. One day, you’ll uncover that single elegant theory detailing all magic \(perhaps a theory bearing your name\?\), but until then, your studies continue\./, "Desdeñas la idea de que la magia se pueda expresar ordenadamente mediante las enseñanzas de cualquier escuela o facultad única, y en su lugar diriges tus estudios autodidactas a elegir lo mejor de cada escuela de magia. Al hacerlo, encontrarás las verdades que hay en la intersección de cada escuela, acercándote más a la naturaleza ideal de la magia arcana. Un día, descubrirás esa única teoría elegante que detalla toda la magia (quizá incluso le otorgues tu nombre), pero hasta entonces, tus estudios continúan."],
            [/You’ve begun to develop your techniques and approach to a job, while building your reputation in rogues’ circles. Choose a rogue’s racket./, "Has empezado a desarrollar tus técnicas y tu forma de aproximarte a un trabajo, a la vez que te labras una reputación en los círculos delictivos. Elige un enredo de pícaro de la lista siguiente."],
            [/You use fast-talking, flattery, and a silver tongue to avoid danger and escape tricky situations. You might be a grifter or con artist, or you might use your skills in certain reputable professions, like a barrister or diplomat./, "Utilizas la charlatanería, la adulación y tu pico de oro para evitar el peligro y salirte de situaciones complicadas. Podrías ser un estafador o un timador, o podrías utilizar tus habilidades en determinadas profesiones reputadas, como por ejemplo abogado o diplomático."],
            [/When you successfully Feint, the target is off guard against your melee attacks until the end of your next turn. On a critical success, the target is off-guard against all melee attacks until the end of your next turn, not just yours. If you Feint while wielding an agile or finesse melee weapon, you can Step immediately after the Feint as a free action./, "Cuando llevas a cabo una Finta con éxito, el objetivo queda desprevenido contra tus ataques cuerpo a cuerpo hasta el final de tu siguiente turno. Con un éxito crítico, el objetivo queda desprevenido contra todos los ataques cuerpo a cuerpo (no sólo contra los tuyos) hasta el final de tu siguiente turno. Si haces una Finta mientras empuñas una arma ágil o sutil, puedes dar un Paso inmediatamente después de la Finta como acción gratuita."],
            [/You’re trained in Deception and Diplomacy. You can choose Charisma as your key attribute./, "Estás entrenado en Engaño y en Diplomacia. Puedes elegir Carisma como atributo clave."],
            [/Nothing beats the thrill of taking something that belongs to someone else. You might be a pickpocket working the streets, a cat burglar sneaking through windows, or even a consultant, testing your clients’ vaults for openings./, "Nada supera la emoción de llevarte algo que pertenece a otro. Podrías ser un carterista que trabaja en la calle, un ratero que se infiltra por las ventanas o incluso un consultor, que comprueba las bóvedas de sus clientes en busca de puntos débiles."],
            [/When a fight breaks out, you prefer swift, lightweight weapons, and you strike where it hurts. When you make a melee Strike with a finesse weapon or finesse unarmed attack, you can add your Dexterity modifier to the damage roll instead of your Strength modifier./, "Cuando empieza la pelea, prefieres las armas rápidas y ligeras, y sabes dar donde duele. Cuando atacas con una arma sutil o un ataque sin arma cuerpo a cuerpo sutil, puedes sumar tu modificador por Destreza a las tiradas de daño en lugar de tu modificador por Fuerza."],
            [/You are trained in Thievery./, "Dispones del rango entrenado en Latrocinio."],
            [/You rely on your intellect to craft intricate schemes, planning 10 steps ahead where others might plan three. You might be a driven detective, a spymaster in the service of a powerful house, or an aspiring crime lord or information broker./, "Confías en tu inteligencia para trazar esquemas complicados, planificando diez pasos por delante donde otros podrían planificar tres. Podrías ser un detective motivado, un maestro de espías al servicio de una casa poderosa o un aspirante a señor del crimen o tratante en información."],
            [/If you successfully identify a creature using Recall Knowledge, that creature is off-guard against your attacks until the start of your next turn; if you critically succeed, it’s off-guard against your attacks for 1 minute./, "Si identificas con éxito a una criatura utilizando Recordar conocimiento, queda desprevenida contra tus ataques hasta el final de tu siguiente turno; si obtienes un éxito crítico, queda desprevenida contra tus ataques durante 1 minuto."],
            [/You’re trained in Society and one of the following skills of your choice: Arcana, Nature, Occultism, or Religion. You can choose Intelligence as your key attribute./, "Estas entrenado en Sociedad y en una de las siguientes habilidades a tu elección: Arcanos, Naturaleza, Ocultismo o Religión. Puedes elegir Inteligencia como atributo clave."],
            [/You prefer the direct approach: strong-arming or intimidation. You might be an enforcer for organized crime, a highway bandit, or a noble who bullies others with threats of your family’s power./, "Prefieres la aproximación directa: mano dura o intimidación. Podrías actuar como matón para el crimen organizado, ser un salteador de caminos o un noble que intimida a otros amenazando con el poder de tu familia."],
            [/You use whatever tools you have to get the job done\. You can deal sneak attack damage with any weapon, not just the weapons listed in the sneak attack class feature\. This benefit doesn’t apply to a simple weapon with a damage die greater than d8 or a martial or advanced weapon with a damage die greater than d6\. \(Apply any abilities that alter the damage die size first\.\) Critical hits you make with these weapons gain the weapon’s critical specialization benefit if the target is off-guard to you\./, "Utilizas cualquier herramienta a tu alcance para conseguir tus objetivos. Puedes infligir daño por ataque furtivo con cualquier arma, no tan solo con las indicadas en el rasgo de clase ataque furtivo. Este beneficio no se aplica a una arma sencilla con un dado de daño mayor que d8 o una arma marcial o avanzada con un dado de daño mayor que d6 (una vez aplicadas todas las aptitudes que alteran el tamaño del dado de daño). Los impactos críticos que llevas a cabo con dichas armas obtienen el beneficio de especialización crítica del arma si el objetivo está desprevenido ante ti."],
            [/You’re trained in Intimidation and medium armor. You can choose Strength as your key attribute. When you gain light armor expertise, you also gain expert proficiency in medium armor, and when you gain light armor mastery, you also gain master proficiency in medium armor./, "Estás entrenado en Intimidación y en armadura intermedia. Puedes elegir Fuerza como atributo clave. Cuando obtienes el rango experto en armadura ligera, también lo obtienes en armadura intermedia y cuando obtienes el rango maestro en armadura ligera, también lo obtienes en armadura intermedia."],
            [/When your enemy can’t properly defend itself, you take advantage to deal extra damage. If you Strike a creature that has the off-guard condition with an agile or finesse melee weapon, an agile or finesse unarmed attack, a ranged weapon attack, or a ranged unarmed attack, you deal an extra 1d6 precision damage. For a ranged attack with a thrown melee weapon, that weapon must also be agile or finesse./, "Cuando tu enemigo no se puede defender adecuadamente, te aprovechas para infligir daño adicional. Si das un Golpe a una criatura que tiene el estado desprevenido con una arma cuerpo a cuerpo ágil o sutil o un ataque sin arma ágil o sutil, un ataque con arma a distancia o un ataque sin armas a distancia, infliges 1d6 daño de precisión adicional. Para un ataque a distancia con una arma cuerpo a cuerpo arrojadiza, dicha arma también tiene que ser ágil o sutil."],
            [/As your rogue level increases, so does the number of damage dice for your sneak attack. Increase the number of dice by one at 5th, 11th, and 17th levels./, "Conforme tu nivel de pícaro aumenta, también lo hace el número de dados de daño de tu ataque furtivo. Incrementa en 1 el número de dados en los niveles 5.º, 11.º y 17.º."],
            [/You spring into combat faster than foes can react. On the first round of combat, if you roll Deception or Stealth for initiative, creatures that haven’t acted are off-guard to you./, "Saltas al combate más rápido de lo que tus enemigos pueden reaccionar. En el primer asalto de combate, si tiras Engaño o Sigilo para tu iniciativa, las criaturas que aún no han actuado están desprevenidas ante ti."],
            [/As someone who takes advantage of openings, you are careful not to leave such gaps yourself. You aren’t off-guard to hidden, undetected, or flanking creatures of your level or lower, or creatures of your level or lower using surprise attack. However, they can still help their allies flank./, "Como alguien que se beneficia de las aberturas, tienes cuidado de no dejarlas tú mismo. No estás desprevenido ante criaturas de tu nivel o inferior escondidas, no detectadas o que te flanquean, o de criaturas de tu nivel o inferir que utilizan ataque por sorpresa. Sin embargo, siguen pudiendo ayudar a sus aliados a flanquear."],
            [/You gain expert proficiency in simple weapons, martial weapons, and unarmed attacks. When you critically succeed at an attack roll against an off-guard creature while using an agile or finesse weapon or an agile or finesse unarmed attack, you apply the critical specialization effect for that weapon or unarmed attack./, "Obtienes competencia a rango experto en las armas sencillas, las marciales y los ataques sin armas. Cuando obtienes un éxito crítico en una tirada de ataque contra una criatura desprevenida mientras utilizas una arma ágil o sutil o un ataque sin armas ágil o sutil, aplicas el efecto de especialización crítica de dicha arma o ataque sin armas."],
            [/You’ve learned to move quickly to avoid explosions, dragons’ breath, and worse. Your proficiency rank for Reflex saves increases to master. When you roll a success on a Reflex save, you get a critical success instead./, "Has aprendido a moverte rápidamente para evitar las explosiones, el aliento de los dragones y cosas aún peores. Tu rango de competencia para las salvaciones de Reflejos se incrementa a maestro. Cuando obtienes un éxito en una salvación de Reflejos, en su lugar obtienes un éxito crítico."],
            [/You’ve developed keen awareness and attention to detail. Your proficiency rank for Perception increases to master./, "Has desarrollado una conciencia aguda y una gran atención al detalle. Tu rango de competencia para Percepción se incrementa a maestro."],
            [/You apply one of the following debilitations, which lasts until the end of your next turn./, "Aplicas una de las siguientes debilitaciones, que dura hasta el final de tu siguiente turno."],
            [/Your physique is incredibly hardy. Your proficiency rank for Fortitude saves increases to expert. When you roll a success on a Fortitude save, you get a critical success instead./, "Tu físico es increíblemente recio. Tu rango de competencia para las salvaciones de Fortaleza se incrementa a experto. Cuando obtienes un éxito en una salvación de Fortaleza, en su lugar obtienes un éxito crítico."],
            [/Your techniques are now harder to resist. Your proficiency rank for your rogue class DC increases to expert./, "Tus técnicas son ahora más difíciles de resistir. Tu rango de competencia para tu CD de pícaro se incrementa a experto."],
            [/You elude danger to a degree that few can match. Your proficiency rank for Reflex saves increases to legendary. When you roll a critical failure on a Reflex save, you get a failure instead. When you roll a failure on a Reflex save against a damaging effect, you take half damage./, "Esquivas el peligro hasta un grado que pocos pueden igualar. Tu rango de competencia para las salvaciones de Reflejos se incrementa a legendario. Cuando sufres un fallo crítico en una salvación de Reflejos, en su lugar sufres un simple fallo. Cuando sufres un fallo en una salvación de Reflejos contra un efecto dañino, tan solo sufres mitad de daño."],
            [/You notice things almost impossible for an ordinary person to detect. Your proficiency rank for Perception increases to legendary./, "Notas cosas casi imposibles de percibir para una persona normal. Tu rango de competencia para la Percepción se incrementa a legendario."],
            [/You’ve mastered a rogue’s fighting moves. Your proficiency ranks increase to master for all simple weapons, martial weapons, and unarmed attacks.#/, "Has dominado las técnicas de lucha de los pícaros. Tu rango de competencia se incrementa a maestro para todas las armas sencillas, marciales y los ataques sin armas."],
            [/Your opportunistic attacks are particularly detrimental. When you use Debilitating Strike, you can apply two debilitations simultaneously; removing one removes both./, "Tus ataques oportunistas son particularmente nocivos. Cuando usas Golpe debilitante, puedes aplicar dos debilitaciones simultáneamente; quitar una quita las dos."],
            [/You play mental games and employ cognitive tricks to throw off mind-altering effects. Your proficiency rank for Will saves increases to master. When you roll a success at a Will save, you get a critical success instead./, "Utilizas juegos mentales y empleas trucos cognitivos para deshacerte de los efectos enajenadores. Tu rango de competencia para las salvaciones de Voluntad se incrementa a maestro. Cuando consigues un éxito en una salvación de Voluntad, en su lugar consi- gues un éxito crítico."],
            [/Your proficiency rank for your rogue class DC increases to master\./, "Tu rango de competencia para tu CD de pícaro se incrementa a maestro."],
            [/The target attempts a Fortitude save against your class DC. It then becomes temporarily immune to your Master Strike for 1 day./, "El enemigo debe llevar a cabo una salvación de Fortaleza contra tu CD de clase. A continuación queda inmune de forma temporal a tu Golpe maestro durante 1 día."],

            // class feat descriptions
            [/Your deity bestows a special spell related to their powers\. Select one domain - a subject of particular interest to you within your religion - from your deity's list\. You gain an initial domain spell for that domain, a spell unique to the domain and not available to other clerics\./, "Tu dios te concede un conjuro especial relacionado con sus poderes. Selecciona un dominio (un tema de interés particular para ti dentro de tu religión) de la lista de tu dios. Obtienes un conjuro de dominio inicial para dicho dominio, único para éste y no disponible para otros clérigos."],
            [/Select one domain — a subject of particular interest to you within your religion — from your deity’s list./, "Selecciona un dominio (un tema de interés particular para ti dentro de tu religión) de la lista de tu dios."],
            [/Domain spells are a type of focus spell. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity to pray to your deity or do service toward their causes./, "Los conjuros de dominio son un tipo de conjuro de foco. Cuesta 1 Punto de Foco lanzar un conjuro de foco y empiezas con una reserva de 1 Punto de Foco. Repones tu reserva de foco durante tus preparativos diarios y puedes recuperar 1 Punto de Foco invirtiendo 10 minutos y utilizando la actividad Reenfocar para rezar a tu dios o llevar a cabo algún servicio en favor de su causa."],
            [/Focus spells are automatically heightened to half your level rounded up, much like cantrips. Focus spells don't require spell slots, and can't be cast using spell slots. Your focus pool can hold one Focus Point for each focus spell you have, up to 3 points./, "Los conjuros de foco se potencian automáticamente a la mitad de tu nivel redondeado hacia arriba, de forma muy parecida a los trucos. Los conjuros de foco no requieren espacios de conjuro y no se pueden lanzar utilizando espacios de conjuro. Tu reserva de foco puede albergar 1 Punto de Foco por cada conjuro de foco de que dispones, hasta 3 puntos."],
            [/You gain the service of a young animal companion that travels with you on your adventures and obeys any simple commands you give it to the best of its abilities./, "Obtienes los servicios de un compañero animal joven que viaja contigo en tus aventuras y obedece lo mejor que puede cualquier orden sencilla que le das."],
            [/You have a connection to the creatures of the natural world that allows you to communicate with them on a rudimentary level\. You can ask questions of, receive answers from, and use the Diplomacy skill with animals\. In most cases, wild animals will give you time to make your case\./, "Tienes una conexión con las criaturas del mundo natural que te permite comunicarte con ellas a un nivel rudimentario. Puedes formularles preguntas, obtener respuestas y utilizar la habilidad Diplomacia con los animales. En la mayoría de circunstancias, los animales salvajes te concederán tiempo para exponer tus argumentos."],
            [/You have a connection to flora that allows you to communicate with them on a rudimentary level. You can ask questions of, receive answers from, and use the Diplomacy skill with plants and fungus./, "Tienes una conexión con la flora que te permite comunicarte con ella a un nivel rudimentario. Puedes formular preguntas, obtener respuestas y utilizar la habilidad Diplomacia con las plantas y los hongos."],
            [/You call a minor spirit of nature into a plant body, creating a leshy companion to aid you in your spellcasting\. You gain a familiar, which has your choice of either the plant or fungus familiar ability; this doesn't count against your usual limit of familiar abilities \(typically 2\)\. The spirit you call has a more tenuous connection to its plant body than fully independent leshies, so it is Tiny in size like other familiars\./i, "Llamas a un espíritu menor de la Naturaleza, que adopta la forma de una planta, creando un compañero leshy para que te ayude en tu lanzamiento de conjuros. Obtienes un familiar, del que puedes elegir si tiene la aptitud de familiar planta u hongo; esto no cuenta contra tu límite habitual de aptitudes de familiar (típicamente 2). El espiritu al que llamas tiene una conexión más tenue con su cuerpo vegetal que los leshys completamente independientes, por lo que es de tamaño Menudo como otros familiares."],
            [/You are at home out in the elements, reveling in the power of nature unleashed\. You do not take circumstance penalties to ranged spell attacks o Perception checks caused by weather, and your targeted spells don't require a flat check to succeed against a target concealed by weather \(such as fog\)\./, "Te encuentras como en casa expuesto a los elementos, gozando del poder de la Naturaleza desencadenada. No sufres penalizadores por circunstancia a los ataques de conjuro a distancia o a las pruebas de Percepción debido a la climatología, y tus conjuros con objetivo no requieren una prueba plana para tener éxito contra un enemigo oculto por un elemento climático (como por ejemplo, la niebla)."],
            [/You are one with the wild, always changing and adapting to meet any challenge. You gain the untamed form order spell, which lets you transform into a variety of shapes that you can expand with druid feats./, "Eres uno con las tierras vírgenes, siempre cambiando y adaptándote para enfrentarte a cualquier desafío. Obtienes el conjuro de orden forma indómita, que te permite transformarte en una gran variedad de formas que puedes expandir mediante dotes de druida."],

            // skill feat descriptions

            // general feat descriptions
            [/You snap your shield in place to ward off a blow. Your shield prevents you from taking an amount of damage up to the shield's Hardness. You and the shield each take any remaining damage, possibly breaking or destroying the shield./, "Interpones tu escudo para protegerte de un Golpe. El escudo evita que sufras una cantidad de daño igual a la Dureza del mismo. Ambos os repartís el daño sobrante, lo que posiblemente puede romper o destruir el escudo."],

            // focus spell descriptions
            [/You heal an animal's wounds, restoring/, "Curas las heridas de un animal, restableciendo al objetivo"],
            [/Hit Points to the target\. The number of actions spent Casting this Spell determines its effect\./, "Puntos de Golpe. El número de acciones invertidas Lanzando este conjuro determina su efecto."],
            [/The spell has a range of touch./, "El conjuro tiene un alcance de toque."],
            [/The spell has a range of 30 feet and restores an additional/, "El conjuro tiene un alcance de 30 pies (9 m) y restablece 8 Puntos de Golpe adicionales al objetivo."],
            [/Hit Points to the target./, "Puntos de Golpe adicionales al objetivo."],
            [/Vines twine into a wicker horn in your hands, and out spills a single fruit, nut, or similar small bit of produce\. A creature who eats the produce with an Interact action regains 1d6\+4 HP\. The cornucopia, as well as any unconsumed pieces of fruit, wither away at the end of the duration\./, "Unos zarcillos se enredan en forma de cuerno de mimbre en tus manos, y de allí surge un solo fruto, nuez o pequeño producto similar. Una criatura que consume el producto mediante una acción de Interactuar recupera 1d6+4 PG. La cornucopia, así como cualquier pieza no consumida de fruta, se marchita al final de la duración del conjuro."],
            [/You surround a foe in a swirling storm of violent winds, roiling clouds, and crackling lightning. The storm deals/, "Rodeas a un enemigo con una tormenta giratoria de vientos violentos, nubes agitadas y rayos restallantes. La tormenta inflige "],
            [/electricity damage to the target with a basic Reflex save. On a failure, the target also is clumsy 2 for 1 round./, "daño por electricidad al objetivo, que tiene que hacer una salvación básica de Reflejos. Con un fallo, el objetivo también queda torpe 2 durante 1 asalto."],
            [/You reach within for a different part of yourself, and you set it free, transforming your body into another form\. You polymorph into any form listed in pest form, which lasts 10 minutes\. All other untamed form shapes last 1 minute\. You can add more shapes to your untamed form list with druid feats; your feat might grant you some or all of the shapes from a given polymorph spell\. When you transform into a shape granted by a spell, you gain all the effects of the shape you chose from a version of the spell heightened to untamed form's rank\. Untamed form allows you to use your own shapeshifting training more easily than most polymorph spells\. When you choose to use your own attack modifier while polymorphed instead of the form's default attack modifier, you gain a \+2 status bonus to your attack rolls\./, "Buscas en tu interior una parte diferente de ti mismo y la dejas en libertad, transformando tu cuerpo en otra forma. Te polimorfas en cualquier forma indicada en forma de peste, que dura 10 minutos. Todas las demás formas de forma indómita duran 1 minuto. Puedes añadir más formas a tu lista de forma indómita mediante dotes de druida; la dote te podría conceder alguna o todas las formas de un conjuro de polimorfía determinado. Cuando te transformas en una forma concedida por un conjuro, obtienes todos los efectos de la forma elegida de una versión del conjuro potenciada al rango de forma indómita. Forma indómita te permite utilizar tu propio entrenamiento como cambiaformas más fácilmente que la mayor parte de conjuros de polimorfía. Cuando eliges utilizar tu propio modificador al ataque mientras estás polimorfado en lugar del modificador al ataque por defecto de la forma, obtienes un bonificador +2 por estatus a tus tiradas de ataque."],
            [/You transform just a part of your body\. Choose any one effect that matches an untamed order feat you have\./, "Sólo transformas una parte de tu cuerpo. Elige cualquier efecto que encaje con una dote de la orden indómita de que dispongas."],
            [/Untamed Form Your hands transform into incredibly sharp claws\. Untamed claws are an unarmed attack, have the agile and finesse traits, and deal 1d6 slashing damage\. You can still hold and use items with your hands while they're transformed by this spell, but you must have a hand free to attack with it\./, "Forma indómita Tus manos se transforman en unas garras increíblemente afiladas. Garras indómitas es un ataque sin arma, tiene los rasgos ágil y sutil e inflige 1d6 daño cortante. Sigues pudiendo sostener y utilizar objetos con las manos mientras están transformadas por este conjuro, pero has de tener una mano libre para atacar con ella."],
            [/Insect Shape Your mouth becomes deadly jaws\. Untamed jaws are an unarmed attack that deal 1d8 piercing damage\./, "Forma de insecto Tu boca se convierte en unas fauces letales. Fauces indómitas es un ataque sin arma que inflige 1d8 daño perforante."],
            [/Elemental Shape You shift your body to be partially composed of elemental matter, granting you resistance 5 to critical hits and precision damage\./, "Forma de elemental Haces cambiar tu cuerpo para que se componga parcialmente de materia elemental, lo que le concede resistencia 5 a los impactos críticos y al daño de precisión."],
            [/Plant Shape Your arms become long vines, increasing your reach to 10 feet \(or 15 feet with a reach weapon\)\./, "Forma de planta Tus brazos se convierten en largas enredaderas, incrementando tu alcance a 10 pies (3 m), o 15 pies (4,5 m) con una arma de alcance."],
            [/Soaring Shape You must cast untamed shift using 2 actions for this benefit\. You grow wings from your back, gaining a fly Speed of 30 feet\./, "Forma voladora Para obtener este beneficio tienes que lanzar forma indómita utilizando 2 acciones. Haces que crezcan alas de tu espalda, obteniendo una velocidad de vuelo de 30 pies (9 m)."],
            [/You expand a ring of glyphs that shields your allies. You and any allies in the area gain a \+1 status bonus to AC. Each time you Sustain the spell, the emanation's radius increases by 5 feet, to a maximum of 30 feet./, "Expandes un anillo de glifos que escuda a tus aliados. Tú y cual- quier aliado tuyo en el interior del área obtenéis un bonificador +1 por estatus a la CA. Cada vez que Mantienes el conjuro, el radio de la emanación se incrementa en 5 pies (1,5 m), hasta un máximo de 30 pies (9 m)."],
            [/You inscribe an invisible eye-shaped rune in the air, creating a sensor as clairvoyance \(page 320\). When created, this eye must be in your line of sight. Each time the spell's duration ends, you can spend 1 Focus Point as a free action to extend the duration for another hour, though as normal, it ends immediately during your next daily preparations./, "Inscribes en el aire una runa invisible en forma de ojo, creando un sensor como clarividencia (pág. 323). Cuando lo creas, el ojo debe estar en tu línea visual. Cada vez que se acaba la duración de conjuro, puedes gastar 1 Punto de Foco como acción gratuita para extender la duración otra hora, aunque, como es habitual, se acaba de inmediato durante tus siguientes preparativos diarios."],
            [/You fire an arrow-shaped bolt of force, one of the most common and reliable forms of battle magic. It automatically hits and deals/, "Disparas un rayo de fuerza en forma de flecha, una de las formas más comunes y fiables de magia de batalla. Impacta automáticamente e inflige"],
            [/force damage to the target./, "daño por fuerza al objetivo."],
            [/You're used to mitigating the damage done by bombs, siege engines, and magical artillery. You gain resistance/, "Estás acostumbrado a mitigar el daño hecho por las bombas, las máquinas de asedio y la artillería mágica. Obtienes resistencia"],
            [/to your choice of acid, cold, electricity, or fire damage from the triggering effect. The resistance applies only to the triggering effect's initial damage./, "a elegir entre daño por ácido, electricidad, frío o fuego por parte del efecto desencadenante. La resistencia sólo se aplica al daño inicial del efecto desencadenante."],
            [/As you call a creature to your side, your magic transforms its body, heightening its ferocity and fortifying its resilience\. The target gains a \+1 status bonus to all checks and DCs \(including its AC\) for the duration of its summoning, up to 1 minute\./, "Cuando llamas a tu lado a una criatura, tu magia transforma su cuerpo, potenciando su ferocidad y fortificando su resiliencia. El objetivo obtiene un bonificador +1 por estatus a todas sus pruebas y CD (incluyendo su CA) mientras dura la convocación, hasta 1 minuto."],
            [/Shades and spirits howl and whirl around you in a display that strikes fear into the hearts of all who witness it\. Enemies in the area are frightened 1 and can't reduce their frightened value below 1 for the spell's duration\./, "Sombras y espíritus aúllan y giran a tu alrededor en una manifestación que infunde temor en los corazones de todos los que la contemplan. Los enemigos en el área quedan asustados 1 y no pueden reducir su valor de asustado por debajo de 1 mientras dura el conjuro."],
            [/Your magic throws the creature's biology into disarray, inducing nausea, fever, and other unpleasant conditions\./, "Tu magia pone patas arriba la biología de la criatura, induciendo mareos, fiebre y otros estados poco agradables."],
            [/You change your body to better suit the moment\. You gain one of the following abilities of your choice\. You can Dismiss this spell\./, "Cambias tu cuerpo para que encaje mejor con el momento. Obtienes una de las siguientes aptitudes a tu elección. Puedes Disipar este conjuro."],
            [/You gain a 20-foot status bonus to your Speed\./, "Obtienes un bonificador de 20 pies (6 m) por estatus a tu Velocidad."],
            [/You gain a climb or swim Speed equal to half your Speed./, "Obtienes una Velocidad de trepar o de Nadar igual a la mitad de tu Velocidad terrestre."],
            [/You gain darkvision./, "Obtienes visión en la oscuridad."],
            [/You gain a pair of claws. These are agile finesse unarmed attacks that deal 1d8 slashing damage./, "Obtienes un par de garras. Son ataques sin armas con los rasgos ágil y sutil, que infligen 1d8 daño cortante."],
            [/You gain scent 60 feet \(imprecise\)\./, "Obtienes olfato 60 pies (18 m) (impreciso)."],
            [/With a ripple of earth, you raise small barriers from the ground\. The ground in the area becomes difficult terrain\. The spell's area is a 5-foot burst if you spent 1 action to cast it, a 10-foot burst if you spent 2 actions, or a 15-foot burst if you spent 3 actions\. A creature can Interact to clear the barriers from one 5-foot square adjacent to it\./, "Con una ondulación de la tierra, elevas del suelo pequeños terraplenes. El suelo del área se convierte en terreno difícil. El área de conjuro es una explosión de 5 pies (1,5 m) si has invertido 1 acción en lanzarlo, una explosión de 10 pies (3 m) si has invertido 2 o una explosión de 15 pies (4,5 m) si has invertido 3. Una criatura puede Interactuar para despejar los terraplenes de una casilla de 5 pies (1,5 m) adyacente a él."],
            [/When you use your magic to support your allies, shared strength bolsters you all\. You gain 2 temporary Hit Points per rank of the triggering spell, and can grant an equal number divided as you choose among allies affected by the triggering spell\. These temporary Hit Points last for 1 minute\./, "Cuando utilizas tu magia para apoyar a tus aliados, una fuerza compartida os refuerza a todos. Obtienes 2 Puntos de Golpe temporales por rango del conjuro desencadenante y puedes conceder un número igual dividido como quieras entre los aliados afectados por el conjuro desencadenante. Estos Puntos de Golpe temporales duran 1 minuto."],
            [/You push at the target's mind to deflect their ire. The target must attempt a Will save./, "Haces presión contra la mente del objetivo para desviar su ira. El objetivo tiene que llevar a cabo una salvación de Voluntad."],
            [/You become invisible, with the same restrictions as the 2nd-rank invisibility spell./, "Te vuelves invisible, con las mismas restricciones del conjuro invisibilidad de 2.º rango."],
            [/You take advantage of one of the most fundamental lessons of magic to levitate and propel your weapon\. You hurl a held melee weapon with which you are trained at the target, making a spell attack roll\. On a success, you deal the weapon's damage as if you had hit with a melee Strike, but add your spellcasting attribute modifier to damage, rather than your Strength modifier\. On a critical success, you deal double damage, and you add the weapon's critical specialization effect\. Regardless of the outcome, the weapon flies back to you and returns to your hand\./, "Te aprovechas de una de las lecciones más fundamentales de la magia para hacer levitar e impulsar tu arma. Lanzas contra el objetivo un arma cuerpo a cuerpo empuñada en la que estás entrenado, haciendo una tirada de ataque de conjuros. Con un éxito, infliges el daño del arma como si hubieras impactado con un Golpe cuerpo a cuerpo, pero sumas al daño tu bonificador por atributo de lanzamiento de conjuros, en lugar de tu bonificador por Fuerza. Con un éxito crítico, infliges doble daño y sumas el efecto de especialización crítica del arma. Sea cual sea el resultado, el arma vuela de vuelta a ti y retorna a tu mano."],
            [/You gather the embers of another caster's spell, using your understanding of unified magic to pick apart their formulas and incantations well enough to imitate the spell yourself, if only for a short time\. Until the end of your next turn, you can Cast the triggering Spell by expending a wizard spell slot of the same rank\. That caster's spells can't trigger your interdisciplinary incantation again for 24 hours\./, "Reúnes las ascuas del conjuro de otro lanzador, utilizando tu comprensión de la magia unificada para descifrar lo suficientemente bien sus fórmulas y sus encantamientos como para imitar el conjuro, si bien por un breve periodo de tiempo. Hasta el final de tu siguiente turno, puedes Lanzar el conjuro desencadenante utilizando un espacio de conjuro de mago del mismo rango. Los conjuros del lanzador no pueden desencadenar tu encantamiento interdisciplinario de nuevo durante 24 horas."],

            // spell descriptions
            [/one-action/, "una acción"],
            [/two-actions/, "dos acciones"],
            [/three-actions/, "tres acciones"],
            [/\bconcentrate\b/, "concentrar"],

            // condition descriptions
            [/You can't see\. All normal terrain is difficult terrain to you\. You can't detect anything using vision\. You automatically critically fail Perception checks that require you to be able to see, and if vision is your only precise sense, you take a -4 status penalty to Perception checks\. You are immune to visual effects\. Blinded overrides dazzled\./i, "No puedes ver. Todo el terreno normal es terreno difícil para ti. No puedes detectar nada utilizando la vista. Fallas automáticamente de forma crítica las pruebas de Percepción que requieren ser capaz de ver y, si la vista es tu único sentido preciso, sufres un penalizador -4 por estatus a las pruebas de Percepción. Eres inmune a los efectos visuales. Cegado prevalece sobre deslumbrado."],
            [/Your movements become clumsy and inexact\. Clumsy always includes a value\. You take a status penalty equal to the condition value to Dexterity-based rolls and DCs, including AC, Reflex saves, ranged attack rolls, and skill checks using Acrobatics, Stealth, and Thievery\./i, "Tus movimientos se vuelven torpes e inexactos. Torpe siempre incluye un valor. Sufres un penalizador por estatus igual al valor del estado a las pruebas y a las CD basadas en la Destreza, incluyendo la CA, las salvaciones de Reflejos, las tiradas de ataque a distancia y las pruebas de habilidad que utilizan Acrobacias, Sigilo y Latrocinio."],
            [/You are difficult for one or more creatures to see due to thick fog or some other obscuring feature\. You can be concealed to some creatures but not others\. While concealed, you can still be observed, but you’re tougher to target\. A creature that you’re concealed from must succeed at a DC 5 flat check when targeting you with an attack, spell, or other effect\. If the check fails, you aren’t affected\. Area effects aren’t subject to this flat check\./, "Es difícil que una o más criaturas te vean debido a niebla espesa o algún otro rasgo oscurecedor. Puedes estar oculto de algunas criaturas pero no de otras. Mientras estás oculto, sigues pudiendo estar observado, pero es más difícil que te designen como objetivo. Una criatura de la que estás oculto ha de tener éxito en una prueba plana CD 5 para designarte como objetivo de un ataque, conjuro u otro efecto. Si la prueba falla, no resultas afectado. Los efectos de área no están sujetos a esta prueba plana."],
            [/You don’t have your wits about you, and you attack wildly\. You are off-guard, you don’t treat anyone as your ally \(though they might still treat you as theirs\), and you can’t Delay, Ready, or use reactions\./i, "No estás alerta y atacas de forma incontrolada. Estás desprevenido, no tratas a nadie como aliado (aunque ellos podrían seguirte tratando a ti como aliado suyo) y no puedes Retrasar, Preparar o utilizar reacciones."],
            [/You use all your actions to Strike or cast offensive cantrips, though the GM can have you use other actions to facilitate attack, such as draw a weapon, move so target is in reach, and so forth\. Your targets are determined randomly by the GM\. If you have no other viable targets, you target yourself, automatically hitting but not scoring a critical hit\. If it’s impossible for you to attack or cast spells, you babble incoherently, wasting your actions\./i, "Usas todas tus acciones para dar Golpes o lanzar trucos ofensivos, aunque el DJ puede hacer que uses otras acciones para facilitar el ataque, como desenvainar un arma, moverte para poner un objetivo a tu alcance, etc. Tus objetivos los determina aleatoriamente el DJ. Si no dispones de otros objetivos viables, te designas como objetivo a ti mismo, acertándote automáticamente pero sin conseguir un impacto crítico. Si te es imposible atacar o lanzar conjuros, balbuceas de forma incoherente, malgastando tus acciones."],
            [/Each time you take damage from an attack or spell, you can attempt a DC 11 flat check to recover from your confusion and end the condition\./i, "Cada vez que sufres daño de un ataque o conjuro, puedes hacer una prueba plana CD 11 para recuperarte de la confusión y acabar con el estado."],
            [/You have been commanded, magically dominated, or otherwise had your will subverted\. The controller dictates how you act and can make you use any of your actions, including attacks, reactions, or even Delay\. The controller usually doesn’t have to spend their own actions when controlling you\./i, "Te han dado una orden, te han dominado mágicamente o por lo demás han subvertido tu voluntad. Tu controlador dicta cómo actúas y puede hacer que uses cualquiera de sus acciones, incluyendo ataques, reacciones o incluso Retrasar. Por lo general, el controlador no tiene que gastar acciones propias cuando te controla."],
            [/Your eyes are overstimulated or your vision is swimming\. If vision is your only precise sense, all creatures and objects are concealed from you\./i, "Tus ojos han sido sobreestimulados o se te ha nublado la vista. Si la vista es tu único sentido preciso, todas las criaturas y objetos están ocultos de ti."],
            [/You can’t hear\. You automatically critically fail Perception checks that require you to be able to hear\. You take a –2 status penalty to Perception checks for initiative and checks that involve sound but also rely on other senses\. If you perform an action that has the auditory trait, you must succeed at a DC 5 flat check or the action is lost; attempt the check after spending the action but before any effects are applied\. You are immune to auditory effects while deafened\./i, "No puedes oír. Fallas críticamente de forma automática todas las pruebas de Percepción que requieren que seas capaz de oír. Sufres un penalizador -2 por estatus a las pruebas de Percepción para la iniciativa y para las pruebas que implican el sonido pero que también se basan en otros sentidos. Si llevas a cabo una acción con el rasgo auditivo, has de tener éxito en una prueba plana CD 5 o la acción se pierde; haz la prueba después de gastar la acción, pero antes de aplicar cualquier efecto. Eres inmune a los efectos auditivos cuando estás ensordecido."],
            [/Your soul has been gripped by a powerful force that calls you closer to death\. Doomed always includes a value\. The dying value at which you die is reduced by your doomed value\. If your maximum dying value is reduced to 0, you instantly die\. When you die, you’re no longer doomed\./i, "Tu alma ha sido aferrada por una poderosa fuerza que te lleva a las puertas de la muerte. Condenado siempre incluye un valor. El valor de moribundo al que mueres se reduce en la misma cantidad que tu valor de condenado. Si tu valor de moribundo máximo queda reducido a 0, mueres al instante. Cuando mueres, dejas de estar condenado."],
            [/Your doomed value decreases by 1 each time you get a full night’s rest./i, "Tu valor de condenado disminuye en 1 cada vez que obtienes una noche completa de descanso."],
            [/Your health and vitality have been depleted as you’ve lost blood, life force, or some other essence\. Drained always includes a value\. You take a status penalty equal to your drained value to Constitution-based rolls and DCs, such as Fortitude saves\. You also lose a number of Hit Points equal to your level \(minimum 1\) times the drained value, and your maximum Hit Points are reduced by the same amount\. For example, if you become drained 3 and you’re a 3rd-level character, you lose 9 Hit Points and reduce your maximum Hit Points by 9\. Losing these Hit Points doesn’t count as taking damage\./i, "Tu salud y tu vitalidad se han visto disminuidos al perder sangre, fuerza vital o alguna otra esencia. Drenado incluye siempre un valor. Sufres un penalizador por estatus igual a tu valor de drenado a las pruebas basadas en la Constitución, como por ejemplo las salvaciones de Fortaleza. También pierdes tantos Puntos de Golpe como tu nivel (mínimo 1) multiplicado por el valor de drenado, y tus Puntos de Golpe máximos se ven reducidos en la misma cantidad. Por ejemplo, si quedas drenado 3 y eres un personaje de 3.er nivel, pierdes 9 Puntos de Golpe y reduces en 9 tu máximo de PG. Perder dichos Puntos de Golpe no cuenta como sufrir daño."],
            [/Each time you get a full night’s rest, your drained value decreases by 1\. This increases your maximum Hit Points, but you don’t immediately recover the lost Hit Points\./i, "Cada vez que obtienes una noche completa de descanso, tu valor de drenado disminuye en 1. Esto incrementa tus PG máximos, pero no recuperas de inmediato los Puntos de Golpe perdidos."],
            [/You are bleeding out or otherwise at death’s door\. While you have this condition, you are unconscious\. Dying always includes a value, and if it ever reaches dying 4, you die\. When you’re dying, you must attempt a recovery check at the start of your turn each round to determine whether you get better or worse\. Your dying condition increases by 1 if you take damage while dying, or by 2 if you take damage from an enemy’s critical hit or a critical failure on your save\./i, "Te estás desangrando o estás de alguna otra manera a las puertas de la muerte. Mientras te encuentras en este estado, estás inconsciente. Moribundo incluye siempre un valor y, si en algún momento llegas a moribundo 4, mueres. Cuando estás moribundo, tienes que hacer una prueba de recuperación al inicio de tu turno cada asalto, para determinar si mejoras o empeoras. Tu estado moribundo se incrementa en 1 si sufres daño mientras estás moribundo, o en 2 si sufres daño por parte de un impacto crítico del enemigo o de un fallo crítico en tu salvación."],
            [/If you lose the dying condition by succeeding at a recovery check and are still at 0 Hit Points, you remain unconscious, but you can wake up as described in that condition\. You lose the dying condition automatically and wake up if you ever have 1 Hit Point or more\. Any time you lose the dying condition, you gain the wounded 1 condition, or increase your wounded condition value by 1 if you already have that condition\./i, "Si pierdes el estado moribundo teniendo éxito en una prueba de recuperación y sigues a 0 Puntos de Golpe, permaneces inconsciente pero te puedes despertar tal y como se indica en el estado inconsciente. Pierdes automáticamente el estado moribundo y te despiertas si llegas a tener 1 Punto de Golpe o más. En cualquier momento en el que pierdes el estado moribundo, sufres el estado herido 1 o incrementas en 1 tu valor de herido si ya lo tienes."],
            [/While you’re dying, attempt a recovery check at the start of each of your turns\. This is a flat check with a DC equal to 10 \+ your current dying value to see if you get better or worse\./i, "Mientras estás moribundo, haces una prueba de recuperación al inicio de cada uno de tus turnos. Se trata de una prueba plana con una CD igual a 10 + tu valor actual de moribundo, para ver si mejoras o empeoras."],
            [/Your dying value is reduced by 2\./i, "Tu valor de moribundo se reduce en 2."],
            [/Your dying value is reduced by 1\./i, "Tu valor de moribundo se reduce en 1."],
            [/Your dying value increases by 1\./i, "Tu valor de moribundo se incrementa en 1."],
            [/Your dying value increases by 2\./i, "Tu valor de moribundo se incrementa en 2."],
            [/If you take damage while you already have the dying condition, increase your dying condition value by 1, or by 2 if the damage came from an attacker’s critical hit or your own critical failure\./i, "Si sufres (más) daño mientras estás moribundo, incrementa tu estado de moribundo en 1 o en 2 si el daño ha procedido de un impacto crítico de un atacante o de un fallo crítico tuyo."],
            [/You are carrying more weight than you can manage\. While you’re encumbered, you’re clumsy 1 and take a 10-foot penalty to all your Speeds\. As with all penalties to your Speed, this can’t reduce your Speed below 5 feet\./i, "Llevas más peso del que puedes acarrear. Mientras estás impedido, estás torpe 1 y sufres un penalizador -10 pies (3 m) a todas tus Velocidades. Como con todos los penalizadores a la Velocidad, éste no puede reducirla por debajo de 5 pies (1,5 m)."],
            [/You’re physically weakened\. Enfeebled always includes a value\. When you are enfeebled, you take a status penalty equal to the condition value to Strength-based rolls and DCs, including Strength-based melee attack rolls, Strength-based damage rolls, and Athletics checks\./i, "Tu capacidad física se ha visto reducida. Debilitado siempre incluye un valor. Cuando estás debilitado sufres un penalizador por estatus igual al valor del estado a las tiradas y a las CD basadas en la Fuerza, incluyendo las tiradas de ataque cuerpo a cuerpo basadas en la Fuerza, las tiradas de daño basadas en la Fuerza y las pruebas de Atletismo."],
            [/You’re compelled to focus your attention on something, distracting you from whatever else is going on around you\. You take a –2 status penalty to Perception and skill checks, and you can’t use concentrate actions unless they \(or their intended consequences\) are related to the subject of your fascination, as determined by the GM\. For instance, you might be able to Seek and Recall Knowledge about the subject, but you likely couldn’t cast a spell targeting a different creature\. This condition ends if a creature uses hostile actions against you or any of your allies\./i, "Te ves obligado a centrar tu atención en algo, lo que te distrae de todo lo demás que sucede a tu alrededor. Sufres un penalizador -2 por estatus a las pruebas de Percepción y de habilidad y no puedes usar acciones con el rasgo concentrar si dichas acciones (o sus consecuencias previstas) no están relacionadas con el motivo de tu fascinación, a determinar por el DJ. Por ejemplo, podrías ser capaz de Buscar y de Recordar conocimiento acerca del motivo, pero probablemente no podrías lanzar un conjuro que designara como objetivo a una criatura diferente. Este estado se acaba si una criatura lleva a cabo acciones hostiles contra ti o contra cualquiera de tus aliados."],
            [/You’re tired and can’t summon much energy\. You take a –1 status penalty to AC and saving throws\. You can’t use exploration activities performed while traveling\./i, "Estás cansado y no puedes reunir mucha energía. Sufres un penalizador -1 por estatus a la CA y a las tiradas de salvación. No puedes usar las actividades de exploración que tienen lugar mientras se viaja."],
            [/You recover from fatigue after a full night’s rest\./i, "Te recuperas de la fatiga después de una noche completa de descanso."],
            [/You’re forced to run away due to fear or some other compulsion\. On your turn, you must spend each of your actions trying to escape the source of the fleeing condition as expediently as possible \(such as by using move actions to flee, or opening doors barring your escape\)\. The source is usually the effect or creature that gave you the condition, though some effects might define something else as the source\. You can’t Delay or Ready while fleeing\./i, "Te ves obligado a huir debido al miedo o a alguna otra compulsión. En tu turno, tienes que gastar cada una de tus acciones intentando huir del origen del estado de la forma más expeditiva posible (por ejemplo, usando acciones de movimiento para irte o abriendo puertas que evitan tu huida). El origen suele ser el efecto o criatura que te ha impuesto el estado, aunque algunos efectos podrían definir otra cosa como origen. No puedes Retrasar ni Preparar mientras huyes."],
            [/You’re gripped by fear and struggle to control your nerves\. The frightened condition always includes a value\. You take a status penalty equal to this value to all your checks and DCs\. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1\./i, "Eres presa del pánico y luchas para controlar los nervios. El estado asustado siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a todas tus pruebas y CD. Si no se indica lo contrario, al final de cada uno de tus turnos el valor de tu estado asustado disminuye en 1."],
            [/You’re held in place by another creature, giving you the off-guard and immobilized conditions\. If you attempt a manipulate action while grabbed, you must succeed at a DC 5 flat check or it is lost; roll the check after spending the action, but before any effects are applied\./i, "Otra criatura te mantiene fijo en tu lugar, lo que te impone los estados desprevenido e inmovilizado. Si emprendes una acción de manipular mientras estás agarrado, has de tener éxito en una prueba plana CD 5 o la pierdes; haz la tirada después de gastar la acción, pero antes de aplicar ningún efecto."],
            [/While you’re hidden from a creature, that creature knows the space you’re in but can’t tell precisely where you are\. You typically become hidden by using Stealth to Hide\. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed\. A creature you’re hidden from is off-guard to you, and it must succeed at a DC 11 flat check when targeting you with an attack, spell, or other effect or it fails to affect you\. Area effects aren’t subject to this flat check\./i, "Mientras estás escondido de una criatura, dicha criatura conoce el espacio en el que estás pero no puede determinar con precisión dónde. Lo normal es que te escondas utilizando Sigilo para Esconderte. Cuando Buscas a una criatura utilizando tan solo sentidos imprecisos, permanece escondida en lugar de observada. Una criatura de la que estás escondido está desprevenida ante ti y ha de tener éxito en una prueba plana CD 11 para designarte como objetivo de un ataque, conjuro u otro efecto, o no consigue afectarte. Los efectos de área no están sujetos a esta prueba plana."],
            [/A creature might be able to use the Seek action to try to observe you\./i, "Una criatura podría ser capaz de utilizar la acción Buscar para observarte."],
            [/You are incapable of movement\. You can’t use any actions that have the move trait\. If you’re immobilized by something holding you in place and an external force would move you out of your space, the force must succeed at a check against either the DC of the effect holding you in place or the relevant defense \(usually Fortitude DC\) of the monster holding you in place\./i, "No puedes moverte. Eres incapaz de utilizar acción alguna con el rasgo movimiento. Si estás inmovilizado por algo que te mantiene fijo en un lugar y una fuerza externa te sacaría de tu espacio, dicha fuerza ha de tener éxito en una prueba, o bien contra la CD del efecto que te mantiene en tu lugar, o bien contra la defensa relevante (por lo general, la CD de Fortaleza) del monstruo que te mantiene inmóvil."],
            [/You can’t be seen\. You’re undetected to everyone\. Creatures can Seek to detect you; if a creature succeeds at its Perception check against your Stealth DC, you become hidden to that creature until you Sneak to become undetected again\. If you become invisible while someone can already see you, you start out hidden to them \(instead of undetected\) until you successfully Sneak\. You can’t become observed while invisible except via special abilities or magic\./i, "No puedes ser visto. Estás no detectado para todo el mundo. Las criaturas pueden Buscar para detectarte; si una criatura tiene éxito en su prueba de Percepción contra tu CD de Sigilo, quedas escondido para ella hasta que utilizas Movimiento furtivo para volver al estado de no detectado. Si te haces invisible cuando alguien puede verte, empiezas escondido para dicha criatura (en lugar de no detectado) hasta que utilizas con éxito Movimiento furtivo. No puedes quedar observado mientras eres invisible excepto mediante el uso de aptitudes especiales o magia."],
            [/Anything in plain view is observed by you\. If a creature takes measures to avoid detection, such as by using Stealth to Hide, it can become hidden or undetected instead of observed\. If you have another precise sense besides sight, you might be able to observe a creature or object using that sense instead\. You can observe a creature with only your precise senses\. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed\./i, "Cualquier cosa a plena vista está observada por ti. Si una criatura toma medidas para evitar la detección, como por ejemplo utilizar el Sigilo para Esconderse, puede pasar a estar escondida o no detectada en lugar de observada. Si tienes otro sentido preciso aparte de la vista, podrías ser capaz de observar a una criatura u objeto utilizando en su lugar dicho sentido. Tan solo puedes observar a una criatura con tus sentidos precisos. Cuando Buscas a una criatura utilizando tan solo sentidos imprecisos, permanece escondida en lugar de observada."],
            [/You’re distracted or otherwise unable to focus your full attention on defense\. You take a –2 circumstance penalty to AC\. Some effects give you the off-guard condition only to certain creatures or against certain attacks\. Others - especially conditions - can make you off-guard against everything\. If a rule doesn’t specify that the condition applies only to certain circumstances, it applies to all of them, such as "The target is off-guard\."/i, "Estas distraído o de alguna otra forma eres incapaz de centrar tu atención completa en la defensa. Sufres un penalizador -2 por circunstancia a la CA. Algunos efectos te imponen el estado desprevenido tan sólo frente a determinadas criaturas o contra determinados ataques. Otros, en especial los estados, te pueden dejar desprevenido contra todo. Si una regla no especifica que el estado sólo se aplica a determinadas circunstancias, se aplica a todas ellas, como por ejemplo «El objetivo queda desprevenido»."],
            [/You’re frozen in place\. You have the off-guard condition and can’t act except to Recall Knowledge and use actions that require only your mind \(as determined by the GM\)\. Your senses still function, but only in the areas you can perceive without moving, so you can’t Seek\./i, "Tu cuerpo está congelado en un lugar. Sufres el estado desprevenido y no puedes actuar excepto para Recordar conocimiento y utilizar acciones que sólo requieren el uso de la mente (a determinar por el DJ). Tus sentidos siguen funcionando, pero sólo en las áreas que puedes percibir sin moverte, por lo que no puedes Buscar."],
            [/You are taking damage from an ongoing effect, such as from being lit on fire\. This appears as "X persistent \[type\] damage," where "X" is the amount of damage dealt and "\[type\]" is the damage type\. Like normal damage, it can be doubled or halved based on the results of an attack roll or saving throw\. Instead of taking persistent damage immediately, you take it at the end of each of your turns as long as you have the condition, rolling any damage dice anew each time\. After you take persistent damage, roll a DC 15 flat check to see if you recover from the persistent damage\. If you succeed, the condition ends\./i, "Estás sufriendo daño de un efecto continuado, como por ejemplo estar ardiendo. Esto aparece como «X daño persistente [tipo]», donde «X» es la cantidad de daño infligido y «[tipo]» es el tipo de daño. Como el daño normal, se puede doblar o reducir a la mitad basándose en los resultados de una tirada de ataque o tirada de salvación. En lugar de sufrir el daño persistente de inmediato, lo sufres al final de cada uno de tus turnos si tienes el estado, tirando de nuevo cualquier dado de daño cada vez. Después de sufrir daño persistente, haz una prueba plana CD 15 para ver si te recuperas del mismo. Si tienes éxito, el estado se acaba."],
            [/You have been turned to stone\. You can’t act, nor can you sense anything\. You become an object with a Bulk double your normal Bulk \(typically 12 for a petrified Medium creature or 6 for a petrified Small creature\), AC 9, Hardness 8, and the same current Hit Points you had when alive\. You don’t have a Broken Threshold\. When the petrified condition ends, you have the same number of Hit Points you had as a statue\. If the statue is destroyed, you immediately die\. While petrified, your mind and body are in stasis, so you don’t age or notice the passing of time\./i, "Te han convertido en piedra. No puedes actuar, ni sentir nada. Te conviertes en un objeto con una Impedimenta doble de la tuya normal (típicamente 12 para una criatura Mediana petrificada o 6 para una criatura Pequeña petrificada), CA 9, Dureza 8 y los mismos Puntos de Golpe actuales que cuando estabas vivo. Careces de Umbral de rotura. Cuando acaba el estado petrificado, tienes el mismo número de Puntos de Golpe que tenías como estatua. Si la estatua queda destruida, mueres de inmediato. Mientras estás petrificado, tu cuerpo y tu mente están en estasis, por lo que no envejeces ni te das cuenta del paso del tiempo."],
            [/You’re lying on the ground\. You are off-guard and take a –2 circumstance penalty to attack rolls\. The only move actions you can use while you’re prone are Crawl and Stand\. Standing up ends the prone condition\. You can Take Cover while prone to hunker down and gain greater cover against ranged attacks, even if you don’t have an object to get behind, which grants you a \+4 circumstance bonus to AC against ranged attacks \(but you remain off-guard\)\./i, "Estás tendido en el suelo. Estás desprevenido y sufres un penalizador -2 por circunstancia a las tiradas de ataque. Las únicas acciones de movimiento que puedes utilizar son Gatear y Ponerte de pie. Ponerte de pie acaba con el estado tumbado. Puedes Ponerte a cubierto mientras estás tumbado para ponerte en cuclillas y conseguir cobertura mayor contra los ataques a distancia, incluso si no tienes ningún objeto tras el que parapetarte, lo que te concede un bonificador +4 por circunstancia a la CA contra los ataques a distancia (pero sigues desprevenido)."],
            [/If you would be knocked prone while you’re Climbing or Flying, you fall\. You can’t be knocked prone when Swimming\./i, "Si algo te haría quedar tumbado cuando estás Trepando o Volando, caes al suelo (ver pág. 421 para las reglas sobre caídas). No puedes quedar tumbado mientras estás Nadando."],
            [/You’re able to act more quickly\. You gain 1 additional action at the start of your turn each round\. Many effects that make you quickened require you use this extra action only in certain ways\. If you become quickened from multiple sources, you can use the extra action you’ve been granted for any single action allowed by any of the effects that made you quickened\. Because quickened has its effect at the start of your turn, you don’t immediately gain actions if you become quickened during your turn\./i, "Eres capaz de moverte con más rapidez. Obtienes 1 acción adicional al inicio de tu turno en cada asalto. Muchos efectos que te aceleran requieren que uses la acción adicional sólo de ciertas formas. Si te aceleras debido a múltiples orígenes, puedes utilizar la acción adicional concedida para cualquier acción individual concedida por cualquiera de los efectos que te han acelerado. Como quiera que acelerado tiene efecto al inicio de tu turno, no obtienes acciones de inmediato si te aceleran durante tu turno."],
            [/You’re tied up and can barely move, or a creature has you pinned\. You have the off-guard and immobilized conditions, and you can’t use any attack or manipulate actions except to attempt to Escape or Force Open your bonds\. Restrained overrides grabbed\./i, "Estás atado y apenas puedes moverte, o una criatura te tiene sujeto. Sufres los estados desprevenido e inmovilizado, y no puedes utilizar ningún ataque o acción de manipular excepto tratar de Huir o Abrir por la fuerza tus ligaduras. Neutralizado prevalece sobre agarrado."],
            [/You feel ill\. Sickened always includes a value\. You take a status penalty equal to this value on all your checks and DCs\. You can’t willingly ingest anything - including elixirs and potions - while sickened\./i, "No te encuentras bien. Indispuesto siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a todas tus pruebas y CD. No puedes ingerir nada voluntariamente (incluyendo elixires y pociones) mientras estás indispuesto."],
            [/You can spend a single action retching in an attempt to recover, which lets you immediately attempt a Fortitude save against the DC of the effect that made you sickened\. On a success, you reduce your sickened value by 1 \(or by 2 on a critical success\)\./i, "Puedes invertir una acción individual vomitando, en un intento de recuperarte, lo que te permite hacer de inmediato una salvación de Fortaleza contra la CD del efecto que te ha dejado indispuesto. Con un éxito, reduces en 1 tu valor de indispuesto (o en 2 con un éxito crítico)."],
            [/You have fewer actions\. Slowed always includes a value\. When you regain your actions, reduce the number of actions regained by your slowed value\. Because you regain actions at the start of your turn, you don’t immediately lose actions if you become slowed during your turn\./i, "Tienes menos acciones. Lentificado siempre incluye un valor. Cuando recuperas tus acciones, reduce el número recuperado en tu valor de lentificado. Como quiera que recuperas acciones al inicio de tu turno, no pierdes acciones de inmediato si te lentifican durante tu turno."],
            [/You’ve become senseless\. You can’t act\. Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns, from being stunned\. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost\. For example, if you were stunned 4, you would lose all 3 of your actions on your turn, reducing you to stunned 1; on your next turn, you would lose 1 more action, and then be able to use your remaining 2 actions normally\. Stunned might also have a duration instead, such as "stunned for 1 minute," causing you to lose all your actions for the duration\./i, "Has perdido el control de tus sentidos. No puedes actuar. Aturdido suele incluir un valor que indica cuántas acciones en total pierdes, posiblemente a lo largo de múltiples turnos, debido a estar aturdido. Cada vez que recuperas acciones, reduce en tu valor de aturdido el número que recuperas, y después reduce tu valor de aturdido en el número de acciones perdidas. Por ejemplo, si estabas aturdido 4, perderías tus 3 acciones del turno, lo que te reduciría a aturdido 1; en tu siguiente turno, perderías una acción más, y después podrías utilizar de forma normal tus 2 acciones restantes. En lugar de ello, aturdido podría tener una duración, como por ejemplo «aturdido durante 1 minuto», lo que te haría perder todas tus acciones durante ese tiempo."],
            [/Stunned overrides slowed\. If the duration of your stunned condition ends while you are slowed, you count the actions lost to the stunned condition toward those lost to being slowed\. So, if you were stunned 1 and slowed 2 at the beginning of your turn, you would lose 1 action from stunned, and then lose only 1 additional action by being slowed, so you would still have 1 action remaining to use that turn\./i, "Aturdido prevalece sobre lentificado. Si la duración de tu estado aturdido se acaba mientras estás lentificado, cuenta las acciones perdidas debido al estado aturdido contra las que has perdido por estar lentificado. Por lo tanto, si estuvieras aturdido 1 y lentificado 2 al inicio de tu turno, perderías 1 acción por aturdido y después 1 acción adicional por lentificado; por lo tanto aún te quedaría 1 acción para utilizar en dicho turno."],
            [/Your thoughts and instincts are clouded\. Stupefied always includes a value\. You take a status penalty equal to this value on Intelligence-, Wisdom-, and Charisma-based rolls and DCs, including Will saving throws, spell attack modifiers, spell DCs, and skill checks that use these attribute modifiers\. Any time you attempt to Cast a Spell while stupefied, the spell is disrupted unless you succeed at a flat check with a DC equal to 5 \+ your stupefied value\./i, "Tus pensamientos y tus instintos están nublados. Anonadado siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a las pruebas y a las CD basadas en la Inteligencia, la Sabiduría y el Carisma, incluyendo las salvaciones de Voluntad, los modificadores al ataque de conjuros, las CD de conjuros y las pruebas de habilidad que utilizan dichos modificadores por atributo. Si Lanzas un conjuro estando anonadado, quedará perturbado a menos que tengas éxito en una prueba plana con una CD igual a 5 + tu valor de anonadado."],
            [/You’re sleeping or have been knocked out\. You can’t act\. You take a –4 status penalty to AC, Perception, and Reflex saves, and you have the blinded and off-guard conditions\. When you gain this condition, you fall prone and drop items you’re holding unless the effect states otherwise or the GM determines you’re positioned so you wouldn’t\./i, "Estás dormido o te han noqueado. No puedes actuar. Sufres un penalizador -4 por estatus a la CA, la Percepción y las salvaciones de Reflejos, además de los estados cegado y desprevenido. Cuando sufres este estado, caes tumbado y sueltas los objetos que sostienes, si el efecto no indica lo contrario o el DJ no determina que estás en una posición que no te lo permite."],
            [/If you’re unconscious because you’re dying, you can’t wake up while you have 0 Hit Points\. If you are restored to 1 Hit Point or more, you lose the dying and unconscious conditions and can act normally on your next turn\./i, "Si estás inconsciente debido a estar moribundo, no puedes despertar mientras estás a 0 Puntos de Golpe. Si se te devuelve a 1 Punto de Golpe o más, pierdes los estados moribundo e inconsciente y puedes actuar normalmente en tu siguiente turno."],
            [/If you are unconscious and at 0 Hit Points, but not dying, you return to 1 Hit Point and awaken after sufficient time passes\. The GM determines how long you remain unconscious, from a minimum of 10 minutes to several hours\. If you are healed, you lose the unconscious condition and can act normally on your next turn\./i, "Si estás inconsciente y a 0 Puntos de Golpe, pero no moribundo, vuelves a 1 Punto de Golpe y despiertas una vez ha pasado el tiempo suficiente. El DJ es quien determina cuánto tiempo permaneces inconsciente, desde un mínimo de 10 minutos hasta varias horas. Si te curan, pierdes el estado inconsciente y puedes actuar normalmente en tu siguiente turno."],
            [/If you’re unconscious and have more than 1 Hit Point \(typically because you are asleep or unconscious due to an effect\), you wake up in one of the following ways\./i, "Si estás inconsciente y tienes más de 1 Punto de Golpe (típicamente porque estás dormido o inconsciente debido a un efecto), despiertas de una de las siguientes formas."],
            [/You take damage, though if the damage reduces you to 0 Hit Points, you remain unconscious and gain the dying condition as normal\./i, "Sufres daño, aunque si el daño te reduce a 0 Puntos de Golpe, quedas inconsciente y sufres el estado moribundo de la forma normal."],
            [/You receive healing, other than the natural healing you get from resting\./i, "Recibes curación, diferente a la natural que obtienes del descanso."],
            [/Someone shakes you awake with an Interact action\./i, "Alguien te mueve para despertarte mediante una acción de Interactuar."],
            [/Loud noise around you might wake you\. At the start of your turn, you automatically attempt a Perception check against the noise’s DC \(or the lowest DC if there is more than one noise\), waking up if you succeed\. If creatures are attempting to stay quiet around you, this Perception check uses their Stealth DCs\. Some effects make you sleep so deeply that they don’t allow you this Perception check\./i, "Hay mucho ruido a tu alrededor que podría despertarte. Al inicio de tu turno, haces automáticamente una prueba de Percepción contra la CD del ruido (o contra la CD menor si hay más de uno), despertando si tienes éxito. Si hay criaturas intentando no hacer ruido a tu alrededor, esta prueba de Percepción utiliza su CD de Sigilo. Algunos efectos te hacen dormir de forma tan profunda que no permiten esta prueba de Percepción."],
            [/If you are simply asleep, the GM decides you wake up either because you have had a restful night’s sleep or something disrupted that rest\./i, "Si simplemente estás dormido el DJ decide que te despiertas, o bien porque has tenido una noche de sueño reparador, o bien porque algo ha interrumpido tu descanso."],
            [/When you are undetected by a creature, that creature can’t see you at all, has no idea what space you occupy, and can’t target you, though you still can be affected by abilities that target an area\. When you’re undetected by a creature, that creature is off-guard to you\./i, "Cuando no has sido detectado por una criatura, dicha criatura no puede verte, no tiene idea alguna del espacio que ocupas, y no puede designarte como objetivo, aunque sigues pudiendo verte afectado por aptitudes con área de efecto. Cuando no has sido detectado por una criatura, dicha criatura está desprevenida ante ti."],
            [/A creature you’re undetected by can guess which square you’re in to try targeting you\. It must pick a square and attempt an attack\. This works like targeting a hidden creature \(requiring a DC 11 flat check, but the flat check and attack roll are rolled in secret by the GM, who doesn’t reveal whether the attack missed due to failing the flat check, failing the attack roll, or choosing the wrong square\. They can Seek to try to find you\./i, "Una criatura que no te ha detectado puede adivinar en qué casilla estás para designarte como objetivo. Tiene que elegir una casilla y llevar a cabo un ataque. Esto funciona igual que designar como objetivo a una criatura escondida (requiriendo una prueba plana CD 11), pero la prueba plana y la tirada de ataque las tira en secreto el DJ, que no revela si el ataque falla debido a fallar la prueba plana, a fallar la tirada de ataque o a elegir la casilla equivocada. Puede Buscar para ver si te encuentra."],
            [/If you’re unnoticed by a creature, that creature has no idea you’re present\. When you’re unnoticed, you’re also undetected\. This matters for abilities that can be used only against targets totally unaware of your presence\./i, "Si estás inadvertido para una criatura, dicha criatura no tiene ni idea de que estás presente. Cuando estás inadvertido, también estás no detectado. Esto sólo importa para las aptitudes que se pueden utilizar sólo contra objetivos totalmente ignorantes de tu presencia."],
            [/You have been seriously injured\. If you lose the dying condition and do not already have the wounded condition, you become wounded 1\. If you already have the wounded condition when you lose the dying condition, your wounded condition value increases by 1\. If you gain the dying condition while wounded, increase your dying condition value by your wounded value\./i, "Has sufrido una herida grave. Si pierdes el estado moribundo y aún no tienes el estado herido, quedas herido 1. Si ya tenías el estado herido cuando pierdes el estado moribundo, el valor de tu estado herido se incrementa en 1. Si sufres el estado moribundo mientras estás herido, incrementa el valor de tu estado moribundo en tu valor de herido."],
            [/The wounded condition ends if someone successfully restores Hit Points to you using Treat Wounds, or if you are restored to full Hit Points by any means and rest for 10 minutes\./i, "El estado herido acaba si alguien te restablece con éxito Puntos de Golpe utilizando Tratar heridas, o bien si te restablecen a tus Puntos de Golpe completos por cualquier medio y descansas durante 10 minutos."],

            // weapon descriptions
            [/These bombs come in a variety of types and levels of power, but no matter the variety, you throw the bomb at the target and it explodes, unleashing its alchemical blast\./i, "Estas bombas exhiben una gran variedad y niveles de potencia pero, sea cual sea la variedad, arrojas la bomba contra el objetivo y explota, desencadenando su explosión alquímica."],
            [/This large and well-made crossbow requires some training to use effectively, but it’s assembled with a cutting-edge firing mechanism that maximizes its speed, power, and accuracy\./i, "Esta ballesta grande y de buena manufactura requiere algún entrenamiento para usarla de forma efectiva, pero está ensamblada con un mecanismo de disparo de vanguardia, que maximiza su velocidad, su potencia y su precisión."],
            [/This broad-bladed sword, sometimes called the hand‑and‑a‑half sword, has a longer grip so it can be held in one hand or used with two hands to provide extra piercing or slashing power\./i, "Esta espada de hoja ancha, a veces llamada espada de mano y media, tiene una empuñadura más larga, por lo que se puede utilizar a una mano o a dos manos para un poder cortante mayor."],
            [/These axes are designed explicitly as weapons, rather than tools\. They typically weigh less, with a shaft reinforced with metal bands or bolts, and have a sharper blade, making them ideal for chopping limbs rather than wood\./i, "Estas hachas han sido diseñadas explícitamente como armas, y no como herramientas. Pesan típicamente menos, tienen el mango reforzado con bandas metálicas o con remaches y su hoja es más afilada, lo que las convierte en ideales para cortar extremidades en lugar de madera."],
            [/This long, narrow tube is used for shooting blowgun darts, using only the power of a forcefully exhaled breath\./i, "Este tubo largo y estrecho se utiliza para disparar dardos, usando sólo el poder del aliento exhalado con fuerza."],
            [/This strong but slender staff is tapered at the ends and well balanced\. It's designed to be an offensive and defensive weapon\./i, "Este bastón fuerte pero delgado es más fino en los extremos y bien equilibrado. Está diseñado como arma ofensiva y defensiva."],
            [/This throwing weapon consists of weights tied to the end of long cords, which can be used to bludgeon foes or entangle their legs./i, "Esta arma arrojadiza consiste en dos pesos atados al extremo de unas largas cuerdas, que se pueden usar para golpear a los enemigos o para enredar sus piernas."],
            [/This broad dagger is carried by dwarves as a weapon, tool, and designation of clan\. Losing or having to surrender a clan dagger is considered a mark of embarrassment to most dwarves\./i, "Esta ancha daga es la que lucen los enanos como arma, herramienta y designación de clan. Perder o tener que rendir una daga de clan se considera altamente embarazoso por parte de la mayoría de los enanos."],
            [/This is a piece of stout wood shaped or repurposed to bludgeon an enemy\. Clubs can be intricately carved pieces of martial art or as simple as a tree branch or piece of wood\./i, "Esto es un trozo de madera recia, al que se da forma o se readapta para atizar con él a un enemigo. Las clavas pueden ser piezas intrincadamente talladas de arte marcial o algo tan simple como una rama de árbol o un trozo de madera."],
            [/This projectile weapon is made from horn, wood, and sinew laminated together to increase the power of its pull and the force of its projectile\. Like all longbows, its great size also increases the bow's range and power\. You must use two hands to fire it, and it cannot be used while mounted\. Any time an ability is specifically restricted to a longbow it also applies to composite longbows unless otherwise stated\./i, "Esta arma de proyectiles está hecha de cuerno, madera y tendones, todo ello laminado junto para incrementar el poder de su tensión y la fuerza de su proyectil. Como todos los arcos largos, su gran tamaño también incrementa su distancia efectiva y su potencia. Tienes que usar las dos manos para dispararlo y no se puede utilizar montado. Siempre que una aptitud está específicamente restringida a un arco largo, como por ejemplo el arma predilecta de Erastil, también se aplica a los arcos largos compuestos si no se indica lo contrario."],
            [/This shortbow is made from horn, wood, and sinew laminated together to increase the power of its pull and the force of its projectile\. Its compact size and power make it a favorite of mounted archers\. Any time an ability is specifically restricted to a shortbow, it also applies to composite shortbows unless otherwise stated\./i, "Este arco corto está hecho de cuerno, madera y tendones, todo ello laminado junto para incrementar el poder de su tensión y la fuerza de su proyectil. Su tamaño compacto y su potencia hacen que sea el favorito de los arqueros montados. Siempre que una aptitud está específicamente restringida a un arco corto, también se aplica a los arcos cortos compuestos si no se indica lo contrario."],
            [/This ranged weapon has a bow-like assembly mounted on a handled frame called a tiller\. The tiller has a mechanism to lock the bowstring in place, attached to a trigger mechanism that releases the tension and launches a bolt\./i, "Esta arma a distancia es un arco montado sobre una base recta llamada timón (NdT: o culata). El timón tiene un mecanismo para fijar la cuerda en su lugar y está conectado con un gatillo que libera la tensión y dispara el virote."],
            [/This small, bladed weapon is held in one hand and used to stab a creature in close combat\. It can also be thrown\./i, "Esta pequeña arma blanca se empuña a una mano y se utiliza para apuñalar a una criatura en combate cerrado. También se puede usar como arma arrojadiza."],
            [/This thrown weapon is larger than an arrow but shorter than a javelin\. It typically has a short shaft of wood ending in a metal tip and is sometimes stabilized by feathers or fur\./i, "Esta arma arrojadiza es más grande que una flecha pero más corta que una jabalina. Suele tener un mástil corto de madera que acaba en una punta metálica y a veces va estabilizado con plumas o pelaje."],
            [/This short, curved, and crude makeshift blade often has holes drilled into it to reduce its weight\. It's a favored weapon of goblins\./i, "Esta espada corta, curva y de tosca manufactura, suele tener agujeros en la hoja para reducir su peso. Es el arma predilecta de los goblins."],
            [/This favored weapon of the dwarves has a large, ornate head mounted on a thick handle\. This powerful axe can be wielded with one hand or two\./i, "Esta arma predilecta de los enanos tiene una cabeza larga y adornada, montada sobre un grueso mango. Esta potente hacha se puede empuñar a una o a dos manos."],
            [/Essentially a longer version of the scimitar, this traditional elven weapon has a thinner blade than its cousin\./i, "Esencialmente una versión más larga de la cimitarra, esta arma tradicional elfa tiene una hoja más delgada que la de la cimitarra."],
            [/This weapon is a heavier, two-handed version of the curved-bladed scimitar\. It is weighted toward the blade's end, making it a powerful slashing weapon\./i, "Esta arma de hoja curva es una versión más pesada y a dos manos de la cimitarra. Tiene más peso hacia el final de la cuchilla, lo que la convierte en una potente arma cortante."],
            [/This halfling weapon looks like a long, two-pronged fork and is used as both a weapon and a cooking implement\./i, "Esta arma de los medianos parece un tenedor largo y con dos puntas y se utiliza (indistintamente) como arma o como instrumento de cocina."],
            [/An unarmed attack\./i, "Un ataque sin armas."],
            [/This weapon consists of a wooden handle attached to a spiked ball or cylinder by a chain, rope, or strap of leather\./i, "Esta arma consiste en un mango de madera fijado a una bola con púas o un cilindro, mediante una cadena, cuerda o tira de cuero."],
            [/A pair of these metal gloves comes with full plate, half plate, and splint armor; they can also be purchased separately and worn with other types of armor\. They not only protect your hands but also transform your hands into lethal weapons\./i, "Un par de estos guantes de metal viene junto a una armadura completa, una de placas y mallas o una laminada; también se pueden comprar por separado y llevarse con otros tipos de armadura. No tan sólo protegen tus manos, sino que también las transforman en armas letales."],
            [/This polearm consists of a long, single-edged blade on the end of a 7-foot pole\. It is extremely effective at delivering lethal cuts at a distance\./i, "Esta arma de asta es una larga cuchilla de un solo filo al final de un asta de 7 pies (2,1 m). Es extremadamente efectiva para propinar cortes letales a distancia."],
            [/More a flail than a mace, this weapon has a short handle attached to a length of chain with a ball at the end\. The ball is propelled to its reach with the flick of the wrist, the momentum of which brings the ball back to the wielder after the strike\./i, "Más un mangual que una maza, esta arma tiene un mango corto fijado a un trozo de cadena con una bola en el extremo. La bola es impulsada hasta su alcance por un giro de la muñeca, el impulso del cual devuelve la bola a quien la empuña después del golpe."],
            [/This gnome tool and weapon features a hammer at one end and a curved pick on the other\. It's such a strange and awkward weapon that others think the gnomes are slightly erratic for using it\./i, "Esta herramienta y arma de los gnomos tiene un martillo en un extremo y un pico curvo en el otro. Es un arma tan extraña e incómoda que los demás piensan que los gnomos son ligeramente erráticos por utilizarla."],
            [/This large battle axe is too heavy to wield with only one hand\. Many greataxes incorporate two blades, and they are often "bearded," having a hook at the bottom to increase the strength of their chopping power\./i, "Esta gran hacha de batalla es demasiado pesada para empuñarla a una mano. Muchas de ellas incorporan dos hojas y a menudo son \"barbadas\", disponiendo de un gancho en la base para aumentar la fuerza de su poder cortante."],
            [/While many greatclubs are intricately carved, others are little more than a sturdy tree branch\. These massive clubs are too heavy to wield with only one hand\./i, "Si bien muchas grandes clavas están intrincadamente talladas, otras son poco más que una recia rama de árbol. Estas enormes clavas son demasiado pesadas como para empuñarlas a una mano."],
            [/This pick has a longer handle and broader head than a regular pick\. It is too heavy to wield in one hand\./i, "Este pico tiene un mango más largo y una cabeza más ancha que un pico normal. Es demasiado pesado para empuñarlo a una mano."],
            [/This immense two-handed sword is nearly as tall as its wielder\. Its lower blade is often somewhat dulled to allow it to be gripped for extra leverage in close-quarter fights\./i, "Esta inmensa espada a dos manos (NdT: a veces llamada montante) es casi tan alta como quien la empuña. La parte de la hoja más cercana a la empuñadura a menudo se afila poco para permitir aferrarla más en combate cerrado."],
            [/This polearm bears a long, often one‑sided, curved blade with a hook protruding from the blunt side of the blade, which can allow its wielder to trip opponents at a distance\. Its shaft is usually 8 feet long\./i, "Esta arma de asta lleva una hoja larga y curva, a menudo de un solo filo, con un gancho que sobresale del lado romo la misma, lo que puede permitir a su portador derribar oponentes a distancia. El asta suele medir unos 8 pies (2,4 m) de largo."],
            [/This polearm has a relatively short, 5-foot shaft\. The business end is a long spike with an axe blade attached\./i, "Esta arma de asta es relativamente corta, unos 5 pies (1,5 m). La parte afilada es una larga púa a la que se ha fijado una hoja de hacha."],
            [/This staff ends in a Y-shaped split that cradles a sling\. The length of the staff provides excellent leverage when used two‑handed to fling rocks or bullets from the sling\./i, "Este bastón acaba en una bifurcación en forma de \"Y\" que aloja una honda. La longitud del bastón proporciona un excelente brazo de palanca cuando se usa a dos manos para lanzar piedras o proyectiles con la honda."],
            [/Sometimes referred to as an alley bow by rogues or ruffians, this small crossbow fires small bolts that are sometimes used to deliver poison to the target\. It's small enough to be shot one-handed, but it still requires two hands to load\./i, "A veces denominada arco de callejón por los pícaros y los rufianes, esta pequeña ballesta dispara virotes igualmente pequeños, que a veces se utilizan para envenenar al objetivo. Es lo suficientemente pequeña como para dispararse a una mano, pero sigues requiriendo ambas manos para cargarla."],
            [/This small axe can be used in close combat or thrown\./i, "Esta pequeña hacha se puede utilizar en combate cerrado o arrojarla."],
            [/This large crossbow is harder to load and more substantial than a regular crossbow, but it packs a greater punch\./i, "Esta gran ballesta es difícil de cargar y pesa más que una ballesta normal, pero tiene más pegada."],
            [/Created by goblins to battle horses, this weapon is essentially a long shaft ending in a blade with a large hook\./i, "Creada por los goblins para luchar contra los caballos, esta arma es esencialmente una larga asta que acaba en una cuchilla provista de un gancho grande."],
            [/This thin spear is well balanced for throwing but is not designed for melee use\./i, "Esta fina lanza está bien equilibrada para arrojarla, pero no está diseñada para uso cuerpo a cuerpo."],
            [/Similar to a sickle and used in some regions to reap grain, a kama has a short, slightly curved blade and a wooden handle\./i, "Similar a una hoz y utilizado en algunas regiones para cosechar el grano, un kama tiene una hoja corta y ligeramente curva y un mango de madera."],
            [/A katana is a curved, single-edged sword known for its wickedly sharped blade\./i, "Una katana es una espada curva y de un solo filo, conocida por lo tremendamente afilado de su hoja."],
            [/Also known as punching daggers, katars are characterized by their H-shaped hand grip that allows the blade to jut out from the knuckles\./i, "También conocidos como puñales, los katar se caracterizan por su empuñadura en forma de \"H\" que permite a la cuchilla sobresalir de los nudillos."],
            [/This staff is topped by a pointed metal circle from which hang several smaller rings that jingle and clang noisily as the staff is moved, allowing you to announce your presence and scare off wild animals as you walk\./i, "Este bastón está rematado por un círculo de metal puntiagudo del que cuelgan varios anillos más pequeños que tintinean y hacen otros sonidos metálicos cuando se mueve, lo que te permite anunciar tu presencia y asustar a los animales salvajes mientras caminas."],
            [/The blade of this foot-long knife curves inward and lacks a cross guard at the hilt\./i, "La hoja de este cuchillo de un pie (30 cm) de longitud se curva hacia dentro y carece de guarda en la empuñadura."],
            [/This spear-like weapon is used by a mounted creature to deal a great deal of damage\./i, "Esta arma parecida a una lanza (pero más larga), la utilizan las criaturas montadas para infligir una gran cantidad de daño."],
            [/This smaller version of the warhammer has a wooden or metal shaft ending in a metal head\. Unlike its heavier cousin, it is light enough to throw\./i, "Esta versión más pequeña del martillo de guerra tiene un mango de metal o de madera que acaba en una cabeza metálica. A diferencia de su primo más pesado, es lo suficientemente ligero como para ser arrojado."],
            [/A light mace has a short wooden or metal shaft ending with a dense metal head\. Used much like a club, it delivers heavy bludgeoning blows, but with extra power derived from the head's metal ridges or spikes\./i, "Una maza ligera tiene un mango corto de madera o de metal que acaba en una densa cabeza metálica. Utilizada en gran medida como una clava, propina golpes muy contundentes, pero con potencia adicional derivada de las rugosidades o púas de metal de que está provista la cabeza."],
            [/A light pick is a modified mining implement with a wooden shaft ending in a pick head crafted more to pierce armor and flesh than chip rocks\./i, "Un pico ligero es una herramienta minera modificada, con un mango de madera que acaba en una cabeza de pico, diseñada más para atravesar armaduras y carne que para partir rocas."],
            [/This 5-foot-tall bow, usually made of a single piece of elm, hickory, or yew, has a powerful draw and is excellent at propelling arrows with great force and at an extreme distance\. You must use two hands to fire a longbow, and it can't be used while mounted\./i, "Este arco de 5 pies (1,5 m) de altura, hecho por lo general a partir de una sola pieza de madera de un nogal o tejo, tiene una fuerte tensión y es excelente para impulsar flechas con gran fuerza y a una distancia extrema. Tienes que usar las dos manos para dispararlo y no se puede utilizar montado."],
            [/This very long spear, sometimes called a pike, is purely for thrusting rather than throwing\. Used by many soldiers and city watch for crowd control and defense against charging enemies, it must be wielded with two hands\./i, "Esta lanza de grandes dimensiones, a veces llamada pica, está diseñada solamente para perforar y no para lanzar. Utilizada por muchos soldados y por la guardia de las ciudades para control de multitudes y defensa contra enemigos a la carga, hay que empuñarla a dos manos."],
            [/Longswords can be one-edged or two‑edged swords\. Their blades are heavy and they're between 3 and 4 feet in length\./i, "Las espadas largas, también conocidas como espadas de armas, pueden ser de filo simple y de doble filo. Tienen la hoja pesada y miden entre 3 y 4 pies (90 cm y 1,2 m) de longitud."],
            [/With a stout haft and a heavy metal head, a mace is sturdy and allows its wielder to deliver powerful blows and dent armor\./i, "Con un recio mango y una pesada cabeza de metal, una maza es recia y permite a quien la empuña asestar poderosos golpes y abollar armaduras."],
            [/This parrying dagger features a robust guard to protect the wielder's hand\./i, "Esta daga de parada dispone de una robusta guarda para proteger la mano de quien la empuña."],
            [/Mauls are massive warhammers that must be swung with two hands\./i, "Los mazos (NdT: también conocidos como atarragas) son enormes martillos de guerra que se tienen que empuñar a dos manos."],
            [/This weapon has a short shaft ending in a metal ball studded with spikes\./i, "Esta arma tiene un mango corto que acaba en una bola de metal tachonada de púas."],
            [/The nunchaku is constructed of two wooden or metal bars connected by a short length of rope or chain\./i, "Un nunchaku está construido a partir de dos barras de madera o de metal, conectadas por un trozo corto de cuerda o de cadena."],
            [/This stout, metal blade of orc design has a horizontal basket hilt with blades jutting from each end, or sometimes one blade like that of a katar\./i, "Esta recia hoja de diseño orco tiene un puño horizontal en forma de cesta del que sobresalen cuchillas a cada extremo o, a veces, una cuchilla como la de un katar."],
            [/This single-bladed bearded axe has a jagged blade that's perfect for separating bone from tendon and cartilage\./i, "Esta hacha barbada de una sola hoja tiene una cuchilla aserrada, perfecta para separar el hueso de los tendones y los cartílagos."],
            [/A pick designed solely for combat has a sturdy wooden shaft and a heavy, pointed head to deliver devastating blows\./i, "Un pico diseñado únicamente para el combate tiene un recio mango de madera y una cabeza pesada y puntiaguda con la que asestar golpes devastadores."],
            [/This polearm is a long trident with a central prong that's longer than the other two\./i, "Esta arma de asta es un tridente largo con una púa central más larga que las otras dos."],
            [/The rapier is a long and thin piercing blade with a basket hilt\. It is prized among many as a dueling weapon\./i, "La ropera es una cuchilla larga y fina, con una empuñadura de cesta (NdT: llamada recazo). Muchos la prefieren como arma para duelos."],
            [/This piercing dagger is a metal spike flanked by a pair of prongs that can be used to trap an enemy's weapon\./i, "Esta daga perforante es una púa de metal, flanqueada por un par de puntas que se pueden utilizar para enganchar la hoja de un enemigo."],
            [/A sap has a soft wrapping around a dense core, typically a leather sheath around a lead rod\. Its head is wider than its grip to disperse the force of a blow, as the weapon's purpose is to knock out its victim rather than to draw blood\./i, "Una cachiporra tiene una cobertura blanda alrededor de un núcleo denso, típicamente una funda de cuero alrededor de una vara de plomo. Tiene la cabeza más ancha que la empuñadura para dispersar la fuerza del golpe, puesto que el propósito del arma es noquear a su víctima en lugar de derramar sangre."],
            [/This curved blade is serrated like a saw, hence the name\./i, "El arma de signatura de los asesinos Mantis Roja, esta hoja curva tiene dientes de sierra y de ahí el nombre."],
            [/This one-handed curved blade is sharp on one side\./i, "Esta espada curva a una mano sólo está afilada por un lado."],
            [/Derived from a farming tool used to mow down long grains and cereals, this weapon has a long wooden shaft with protruding handles, capped with a curved blade set at a right angle\./i, "Derivada de una herramienta agrícola utilizada para segar granos largos y cereales, esta arma tiene un largo mango de madera con asideros sobresalientes, rematado por una cuchilla curva fijada en ángulo recto."],
            [/Your body produces a nearly endless supply of hard seedpods\. You gain a seedpod ranged unarmed attack with a range increment of 30 feet that deals 1d4 bludgeoning damage\. On a critical hit, a seedpod bursts, issuing forth a tangle of vegetation that imposes a –10-foot circumstance penalty on the target’s Speed until the start of your next turn\. Seedpods do not add critical specialization effects\./i, "Tu cuerpo produce un suministro casi interminable de duros tegumentos. Obtienes un ataque sin armas a distancia de tegumento con un incremento de rango de distancia de 30 pies que inflige 1d4 daño contundente. Con un impacto crítico, el tegumento explota, expulsando una maraña de vegetación que impone un penalizador -10 pies por circunstancia a la Velocidad del objetivo hasta el inicio de tu siguiente turno. Los tegumentos no añaden efectos de especialización crítica."],
            [/A shield bash is not actually a weapon, but a maneuver in which you thrust or swing your shield to hit your foe with an impromptu attack\./i, "Un golpe con el escudo no es en realidad un arma, sino una maniobra en la que empujas o haces girar el escudo para atizar a tu enemigo con un ataque improvisado."],
            [/Typically a round, convex, or conical piece of thick metal attached to the center of a shield, a shield boss increases the bludgeoning damage of a shield bash\./i, "Típicamente una pieza redonda, convexa o cónica de grueso metal fijada en el centro del escudo, un umbo incrementa el daño contundente de un golpe con el escudo."],
            [/These metal spikes are strategically placed on the defensive side of the shield to deal piercing damage with a shield bash\./i, "Estas púas de metal están estratégicamente colocadas en el lado defensivo del escudo para infligir daño perforante mediante un golpe con el mismo."],
            [/This smaller bow is made of a single piece of wood and favored by skirmishers and cavalry\./i, "Este pequeño arco está hecho de una sola pieza de madera y es el favorito de los hostigadores y de la caballería."],
            [/These blades come in a variety of shapes and styles, but they are typically 2 feet long\./i, "Estas hojas suelen tener una gran variedad de formas y de estilos, pero miden típicamente 2 pies de longitud."],
            [/This "throwing star" is a small piece of flat metal with sharp edges, designed to be flung with a flick of the wrist\./i, "Esta \"estrella arrojadiza\" es una pequeña pieza de metal plano y bordes afilados, diseñada para lanzarse con un giro de muñeca."],
            [/Originally a farming tool used for reaping grain, this one-handed weapon has a short wooden handle ending in a curved blade, sometimes sharpened on both sides\./i, "Originalmente una herramienta agrícola utilizada para segar el grano, esta arma a una mano tiene un mango corto de madera que acaba en una cuchilla curva, a veces afilada por ambos lados."],
            [/Little more than a leather cup attached to a pair of straps, a sling can be used to fling smooth stones or sling bullets at a range\./i, "Poco más que un trozo de cuero atado a un par de cuerdas, una honda se puede utilizar para lanzar a distancia piedras lisas o balas de honda."],
            [/A long metal shaft ending with a metal spike, a spear can be used one-handed as a melee weapon and can be thrown\./i, "Un largo mango de metal que acaba en una púa metálica, una lanza se puede usar a una mano como arma cuerpo a cuerpo, pero también puede ser arrojada."],
            [/A special attack awarded via a feat or special\./i, "Un ataque especial obtenido por un dote u otra cosa especial."],
            [/This 4‑foot‑long length of chain is covered with barbs and has spikes on one or both ends\. Some feature metal hoops used as handgrips\./i, "Esta cadena de 4 pies de longitud está cubierta de espinas y dispone de púas afiladas en uno o en ambos extremos. Algunas disponen de aros de metal, que se utilizan como asideros."],
            [/Providing the same defensive function as a standard gauntlet, this version has a group of spikes protruding from the knuckles to deliver piercing damage with a punch\./i, "Proporcionando la misma función defensiva que un guantelete normal, esta versión tiene un grupo de púas que sobresalen de los nudillos."],
            [/This long piece of wood can aid in walking and deliver a mighty blow\./i, "Este largo trozo de madera puede ayudar a caminar y además propinar poderosos golpes."],
            [/From a central metal ring, four tapering metal blades extend like points on a compass rose\. When gripping a starknife from the center, the wielder can use it as a melee weapon\. It can also be thrown short distances\./i, "A partir de un aro metálico central, se extienden cuatro cuchillas también metálicas y puntiagudas, como las puntas de una rosa de los vientos. Cuando se empuña un cuchillo de estrella por el centro, quien lo hace lo puede utilizar como arma cuerpo a cuerpo. También se puede lanzar a distancias cortas."],
            [/This heavy blade is favored by guardians of religious sites\. It has a distinctive, crescent-shaped blade that seems to be a mix of a sickle and sword\. It often has holes drilled into the blade or the pommel so that bells or other holy trinkets can be affixed to the weapon as an aid for prayer or mediation\./i, "Esta hoja pesada es la favorita de los guardianes de los lugares religiosos. Tiene una cuchilla distintiva en forma de media luna, que parece una mezcla entre una hoz y una espada. A menudo se han practicado agujeros en la hoja o en la empuñadura para poder colocar campanillas u otras baratijas sagradas."],
            [/This three-pronged, spear-like weapon typically has a 4-foot shaft\. Like a spear, it can be wielded with one hand or thrown\./i, "Esta arma de tres puntas, parecida a una lanza, suele tener un mango de 4 pies de longitud. Igual que una lanza, se puede empuñar a una mano o lanzarse."],
            [/This short-bladed, single-edged sword is typically carried as part of a pair alongside a katana\./i, "Esta espada de hoja corta y un solo filo suele formar parte de una pareja junto a una katana."],
            [/This large flail has a long shaft connected to a shorter piece of stout wood or metal that's sometimes inlaid with spikes\./i, "Este mangual de grandes dimensiones tiene un mango largo, conectado a una pieza más corta de recia madera o de metal, a veces tachonada de púas."],
            [/This weapon has a wooden shaft ending in a large, heavy metal head\. The head of the hammer might be single-sided or double-sided, but it's always capable of delivering powerful bludgeoning blows\./i, "Esta arma tiene un mango de madera que acaba en una cabeza grande y pesada de metal. La cabeza del martillo puede ser sencilla o doble, pero siempre es capaz de propinar fuertes golpes."],
            [/This long strand of thick leather, often braided, delivers a painful but nonlethal slash at a distance, usually accompanied by a distinctive cracking sound\./i, "Este largo trozo de grueso cuero, a menudo trenzado, propina un golpe cortante, doloroso pero no letal, a distancia acompañado por lo general de un chasquido distintivo."],

            // armor descriptions
            [/Plate mail consists of interlocking plates that encase nearly the entire body in a carapace of steel\. It is costly and heavy, and the wearer often requires help to don it correctly, but it provides some of the best defense armor can supply\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "Una armadura completa consiste en placas metálicas entrelazadas, que cubren casi todo el cuerpo en un caparazón de acero. Es cara y pesada y el portador a menudo requiere ayuda para ponérsela correctamente, pero proporciona la mejor defensa que una armadura puede conceder. Una armadura de este tipo lleva por debajo una armadura acolchada e incluye unos guanteletes."],
            [/A mix of flexible and molded boiled leather, a suit of this type of armor provides some protection with maximum flexibility\./i, "Una mezcla de cuero hervido flexible y moldeado, una armadura de este tipo proporciona algo de protección con una flexibilidad máxima."],
            [/This leather armor is reinforced with metal studs and sometimes small metal plates, providing most of the flexibility of leather armor with more robust protection\./i, "Esta armadura de cuero está reforzada con remaches de metal y a veces pequeñas placas metálicas, proporcionando gran parte de la flexibilidad de una armadura de cuero, pero con una protección más robusta."],
            [/A mix of furs, sturdy hide, and sometimes molded boiled leather, this armor provides protection due to its layers of leather, though its bulkiness slows the wearer down and decreases mobility\./i, "Una mezcla de pelaje de animal, piel gruesa y a veces cuero hervido moldeado, esta armadura proporciona protección debido a sus capas de cuero, aunque su volumen lentifica al portador y reduce su movilidad."],
            [/Half plate consists of most of the upper body plates used in full plate, with lighter or sparser steel plate protection for the arms and legs\. This provides some of the protection of full plate with greater flexibility and speed\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "La armadura de placas y mallas consiste en la mayoría de las placas metálicas utilizadas en una armadura completa, con una protección más ligera o menor para brazos y piernas. Esto proporciona parte de la protección de la armadura completa, permitiendo mayor flexibilidad y velocidad. Una armadura de este tipo lleva por debajo una armadura acolchada e incluye unos guanteletes."],
            [/This type of armor is chain mail reinforced with flexible, interlocking metal plates, typically located on the wearer’s torso, upper arms, and legs\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "Este tipo de armadura es una cota de malla reforzada con placas de metal flexibles y entrelazadas, situadas típicamente en el torso, los brazos y las piernas del portador. Una armadura de este tipo lleva por debajo una armadura acolchada y unos guanteletes."],
            [/Sometimes called a hauberk, this is a long shirt constructed of the same metal rings as chainmail\. However, it is much lighter than chainmail and protects only the torso, upper arms, and upper legs of its wearer\./i, "A veces denominado joruca, se trata de una camisa larga construida con los mismos anillos de metal que una cota de malla. Sin embargo, es mucho más ligero que la cota de malla y sólo protege el torso, los brazos y los muslos de su portador."],
            [/Though referred to as a breastplate, this type of armor consists of several pieces of plate or half-plate armor that protect the torso, chest, neck, and sometimes the hips and lower legs\. It strategically grants some of the protection of plate while allowing greater flexibility and speed\./i, "A pesar de su nombre, este tipo de armadura consiste en diversas piezas de armadura completa o armadura de placas y mallas que protegen el torso, el pecho, el cuello y a veces las caderas y las piernas. Estratégicamente concede parte de la protección de la armadura completa permitiendo mayor flexibilidad y velocidad."],
            [/Scale mail consists of many metal scales sewn onto a reinforced leather backing, often in the form of a long shirt that protects the torso, arms, and legs\./i, "Una cota de escamas consiste en muchas escamas metálicas cosidas a una base de cuero reforzado, a menudo en forma de una camisa larga (o jubón) que protege el torso, los brazos y las piernas."],
            [/A suit of chain mail consists of several pieces of armor composed of small metal rings linked together in a protective mesh\. It typically includes a chain shirt, leggings, a pair of arms, and a coif, collectively protecting most of the body\./i, "Una cota de malla consiste en varias piezas de armadura compuestas de pequeños anillos metálicos entrelazados formando una malla protectora. Suele incluir un camisote de malla, grebas, brazales y una escarcela, protegiendo colectivamente la mayor parte del cuerpo."],
            [/This armor is simply a layer of heavy, quilted cloth, but it is sometimes used because it’s so inexpensive\. Padded armor is easier to damage and destroy than other types of armor\. Heavy armor comes with a padded armor undercoat included in its Price, though it loses the comfort trait when worn under heavy armor\. You can wear just that padded armor undercoat to sleep in, if your heavy armor is destroyed, or when otherwise not wearing the full heavy armor\. This allows you to keep the armor invested and benefit from the power of any runes on the associated heavy armor, but no one else can wear your heavy armor without the padded undercoat\./i, "Esta armadura (NdT: comúnmente denominada gambesón) es simplemente una capa de tela gruesa y guateada, pero a veces se usa porque es muy barata. La ropa acolchada es más fácil de dañar y destruir que otros tipos de armadura. Las armaduras pesadas vienen con una capa interior de ropa acolchada incluida en el Precio, aunque ésta última pierde el rasgo cómoda cuando se lleva bajo una armadura pesada. Para dormir, si tu armadura pesada resulta destruida o cuando por lo demás no llevas la armadura pesada completa, puedes llevar tan sólo tu ropa acolchada. Eso te permite mantener investida la armadura mágica y beneficiarte del poder de cualesquiera runas de la armadura pesada asociada, pero nadie más puede llevar tu armadura pesada sin la capa interior acolchada."],
            [/Adventurers who don’t wear armor travel in durable clothing\. Though it’s not armor and uses your unarmored defense proficiency, it still has a Dex Cap and can grant an item bonus to AC if etched with potency runes\./i, "Los aventureros que no llevan armadura viajan equipados con ropa duradera. Aunque no se trata de armadura y utiliza tu competencia en defensa sin armadura, sigue teniendo un tope por Des y puede conceder un bonificador por objeto a la CA si se le graban runas de potencia"],
            [/Wearing no armor\./i, "No llevas armadura."],

            // gear descriptions
            [/These four-pronged metal spikes can damage a creature’s feet\. You can scatter caltrops in an empty square adjacent to you with an Interact action\. The first creature that moves into that square must succeed at a DC 14 Acrobatics check or take 1d4 piercing damage and 1 persistent bleed damage\. A creature taking persistent bleed damage from caltrops takes a –5-foot penalty to its Speed\. Spending an Interact action to pluck the caltrops free reduces the DC to stop the bleeding\. Once a creature takes damage from caltrops, enough are ruined that other creatures moving into the square are safe\. Deployed caltrops can be salvaged and reused if no creatures took damage from them\. Otherwise, enough are ruined that they can’t be salvaged\./i, "Estas púas de metal de cuatro puntas pueden dañar los pies de una criatura. Puedes esparcir abrojos en una casilla vacía adyacente a ti con una acción de Interactuar. La primera criatura que se mueve a dicha casilla tiene que superar una prueba de Acrobacias CD 14 o sufrir 1d4 daño perforante y 1 daño persistente por sangrado. Una criatura que sufre daño persistente por sangrado debido a los abrojos sufre un penalizador -5 a su Velocidad. Invertir una acción de Interactuar para quitarse los abrojos reduce la CD para detener el sangrado. Una vez que una criatura haya sufrido daño debido a los abrojos, se habrán gastado los suficientes como para que otras criaturas que muevan a dicha casilla estén seguras. Los abrojos desplegados se pueden recuperar y reutilizar si ninguna criatura sufre daño debido a los mismos. De lo contrario, se gastan tantos que no se puede recuperar nada."],
            [/You can use oil to fuel lanterns, but you can also set a pint of oil aflame and throw it\. You must first spend an Interact action preparing the oil, then throw it with another action as a ranged attack\. If you hit, it splatters on the creature or in a single 5-foot square you target\. You must succeed at a DC 10 flat check for the oil to ignite successfully when it hits\. If the oil ignites, the target takes 1d6 fire damage\./i, "Puedes utilizar el aceite para encender linternas, pero también puedes prenderle fuego a 1 pinta (0,5 l) de aceite y lanzarla. Debes primero invertir una acción de Interactuar preparando el aceite, y después lanzarlo con otra acción como un ataque a distancia. Si aciertas, salpica a la criatura o a un solo cuadrado de 5 pies (1,5 m) de lado al que designas como objetivo. Has de tener éxito en una prueba plana CD 10 para que el aceite se encienda con éxito cuando impacta. Si el aceite se enciende, el objetivo sufre 1d6 daño por fuego."],
            [/Saddlebags come in a pair\. Each can hold up to 3 Bulk of items, and the first 1 Bulk of items in each doesn’t count against your mount’s Bulk limit\. The Bulk value given is for saddlebags worn by a mount\. If you are carrying or stowing saddlebags, they count as 1 Bulk instead of light Bulk\./i, "Las alforjas vienen por parejas. Cada una puede contener hasta Impedimenta 3 en objetos, pero la primera Impedimenta 1 de objetos en cada una no cuenta contra el límite de Impedimenta de tu montura. El valor de Impedimenta que se da es para unas alforjas puestas en una montura. Si las llevas tú o las llevas guardadas, cuentan como Impedimenta 1 en lugar de ligera."],
            [/A torch sheds bright light in a 20-foot radius \(and dim light to the next 20 feet\) for 1 hour\. It can be used as an improvised weapon that deals 1d4 bludgeoning damage plus 1 fire damage\./i, "Una antorcha emite luz brillante en un radio de 20 pies (6 m) y luz tenue en los siguientes 20 pies (6 m) durante 1 hora. Se puede usar como arma improvisada que inflige 1d4 daño contundente mas 1 daño por fuego."],
            [/Tack includes all the gear required to outfit a riding animal, including a saddle, bit and bridle, and stirrups if necessary\. Especially large or oddly shaped animals might require specialty saddles\. These can be more expensive or hard to find, as determined by the GM\. The Bulk value given is for tack worn by a creature\. If carried, the Bulk increases to 2\./i, "Los arreos incluyen todo el equipo necesario para equipar a un animal de monta, incluyendo una silla de montar, brida y bocado y estribos si es necesario. Los animales especialmente grandes o de forma extraña podrían requerir sillas de montar especializadas. Este material podría ser más caro o más difícil de encontrar, a criterio del DJ. El valor de Impedimenta que se da es para unos arreos puestos en una criatura. Si se transportan, la Impedimenta se incrementa a 2."],
            [/A compass helps you Sense Direction or navigate, provided you’re in a location with uniform magnetic fields\. Without a compass, you take a –2 item penalty to these checks \(similar to using a shoddy item\)\. A lensatic compass gives you a \+1 item bonus to these checks\./i, "Una brújula te ayuda a Sentir la dirección o a orientarte, si estás en un lugar donde los campos magnéticos son uniformes. Sin una de ellas, sufres un penalizador -2 por objeto a dichas pruebas (similar a estar usando un objeto de baja calidad). Una brújula de lente y dial te concede un bonificador +1 por objeto a estas pruebas."],
            [/You can pull a dueling cape you’re wearing from your shoulder and wrap it around your arm with an Interact action\. While wielding the dueling cape this way, the cape uses that arm and hand, and you can’t hold anything else in that hand\. While you do so, you can spend an action to hold it in a protective position, giving you a \+1 circumstance bonus to AC and to Deception checks to Feint until the start of your next turn\./i, "Te puedes quitar una capa de duelo que llevas puesta y enrollarla alrededor de tu brazo con una acción de Interactuar. Mientras llevas la capa de duelo de esa forma, esa mano y ese brazo están ocupados y no puedes sostener nada más. Mientras lo haces, puedes invertir una acción para sostenerla en una posición protectora, lo que te concede un bonificador +1 por circunstancia a la CA y a las pruebas de Engaño para Fintar hasta el inicio de tu siguiente turno."],
            [/A typical spyglass lets you see eight times farther than normal\. A fine spyglass adds a \+1 item bonus to Perception checks to notice details at a distance\./i, "Un catalejo típico te permite ver ocho veces más lejos de lo normal. Un catalejo de gran calidad suma un bonificador +1 por objeto a las pruebas de Percepción para ver detalles a distancia."],
            [/Picking a poor lock requires two successful DC 15 Thievery checks, a simple lock requires three successful DC 20 Thievery checks, an average lock requires four successes at DC 25, a good lock requires five successes at DC 30, and a superior lock six successes at DC 40\./i, "Forzar una cerradura barata requiere dos pruebas con éxito de Latrocinio CD 15, una sencilla requiere tres éxitos a CD 20, una normal requiere cuatro éxitos a CD 25, una buena requiere cinco éxitos a CD 30 y una superior, seis éxitos a CD 40."],
            [/A wooden chest can hold up to 8 Bulk of items./i, "Un cofre de madera puede almacenar hasta Impedimenta 8 en objetos."],
            [/Scholarly journals are uncommon\. Each scholarly journal is a folio on a very specific topic, such as vampires or the history of a single town or neighborhood of a city\. If you spend 1 minute referencing an academic journal before attempting a skill check to Recall Knowledge about the subject, you gain a \+1 item bonus to the check\. A compendium of journals costs five times as much as a single journal and requires both hands to use; each compendium contains several journals and grants its bonus on a broader topic, such as all undead or a whole city\. The GM determines what scholarly journals are available in any location\./i, "Los diarios de erudito son poco comunes. Cada uno de ellos es un libro de tamaño folio sobre un tema específico, como por ejemplo los vampiros o la historia de una sola población o de un barrio de una ciudad. Si inviertes 1 minuto consultando un diario de erudito antes de hacer una prueba de habilidad para Recordar conocimiento acerca del tema, obtienes un bonificador +1 por objeto a la prueba. Un compendio de diarios cuesta cinco veces lo que un solo diario y se ha de sostener a dos manos; cada compendio contiene diversos diarios y concede su bonificador sobre un tema más amplio, como por ejemplo todos los muertos vivientes o una ciudad entera. El DJ es quien determina qué diarios de erudito hay disponibles en cualquier lugar."],
            [/This item is the starter kit for an adventurer, containing the essential items for exploration and survival\. The Bulk value is for the entire pack together, but see the descriptions of individual items as necessary\./i, "Éste es el conjunto inicial para un aventurero y contiene los objetos esenciales para la exploración y la supervivencia. El valor de Impedimenta es para el conjunto del equipo, pero consulta la descripción de los objetos individuales si es necesario."],
            [/The pack contains the following items: backpack \(containing the other goods\), bedroll, 10 pieces of chalk, flint and steel, 50 feet of rope, 2 weeks' rations, soap, 5 torches, and a waterskin\./i, "El equipo contiene los siguientes objetos: una mochila (que contiene los demás objetos), un saco de dormir, 10 trozos de tiza, pedernal y yesca, 50 pies (15 m) de cuerda, raciones para 2 semanas, jabón, 5 antorchas y un odre."],
            [/A repair toolkit allows you to perform simple repairs while traveling\. It contains a portable anvil, tongs, woodworking tools, a whetstone, and oils for conditioning leather and wood\. You can use a repair toolkit to Repair items using the Crafting skill\. A superb repair kit gives you a \+1 item bonus to the check\. You can draw and replace a worn repair toolkit as part of the action that uses it\./i, "Un equipo de reparaciones te permite llevar a cabo reparaciones sencillas cuando viajas. Contiene un yunque portátil, tenazas, herramientas de carpintero, una piedra de amolar y aceites para tratar el cuero y la madera. Puedes utilizar un equipo de reparaciones para Reparar objetos utilizando la habilidad Artesanía. Un equipo de reparaciones soberbio te concede un bonificador +1 por objeto a la prueba. Puedes reemplazar un equipo de reparaciones gastado por uno nuevo como parte de la acción que lo utiliza."],
            [/You can throw a grappling hook with a rope tied to it to make a climb easier\. To anchor a grappling hook, make a ranged attack roll using your simple weapon proficiency against a DC depending on the target, typically at least DC 20\. This attack has the secret trait\. On a success, your hook has a firm hold, but on a critical failure, the hook seems like it will hold but actually falls when you’re partway up\./i, "Puedes lanzar un garfio de abordaje con una cuerda atada al mismo para hacer más fácil una escalada. Para anclar un garfio de abordaje, haz una tirada de ataque a distancia utilizando tu competencia con armas sencillas contra una CD que depende del objetivo, típicamente por lo menos CD 20. Este ataque tiene el rasgo secreto. Con un éxito, tu garfio queda firmemente anclado, aunque con un fallo crítico parece como si fuera a aguantar, pero en realidad se suelta cuando estás a media subida."],
            [/You can manacle someone who is willing or otherwise at your mercy as an exploration activity taking 10–30 seconds depending on the creature’s size and how many manacles you apply\. A two-legged creature with its legs bound takes a –15-foot circumstance penalty to its Speeds, and a two-handed creature with its wrists bound has to succeed at a DC 5 flat check any time it uses a manipulate action or else that action fails\. This DC may be higher depending on how tightly the manacles constrain the hands\. A creature bound to a stationary object is immobilized\. For creatures with more or fewer limbs, the GM determines what effect manacles have, if any\. Freeing a creature from poor manacles requires two successful DC 17 Thievery checks, simple manacles requires three successes at DC 22, average manacles require four successes at DC 27, good manacles require five successes at DC 32, and superior manacles require six successes at DC 42\./i, "Puedes ponerle unos grilletes a alguien con su consentimiento o si está a tu merced como una actividad de exploración que dura entre 10 y 30 segundos dependiendo del tamaño de la criatura y de cuántos grilletes le pongas. Una criatura de dos piernas con las piernas ligadas sufre un penalizador -15 pies (4,5 m) por circunstancia a sus Velocidades y una criatura de dos manos con ellas ligadas tiene que tener éxito en una prueba plana CD 5 cada vez que utiliza una acción de manipular, o la acción falla. Esta CD puede ser mayor dependiendo de con qué fuerza se han ajustado los grilletes para inmovilizar las manos. Una criatura atada a un objeto estacionario está inmovilizada. Para las criaturas con más o menos extremidades, el DJ es quien determina qué efectos tienen los grilletes, si lo tienen. Liberar a una criatura de unos grilletes baratos requiere dos éxitos en sendas pruebas de Latrocinio CD 17, unos sencillos requieren tres éxitos a CD 22, unos normales requieren cuatro éxitos a CD 27, unos buenos requieren cinco éxitos a CD 32 y unos superiores requieren seis a CD 42."],
            [/This entry is a catchall for basic hand tools that don’t have a specific adventuring purpose\. A hoe, shovel, or sledgehammer is a long tool, and a hand drill, ice hook, or trowel is a short tool\. A tool can usually be used as an improvised weapon, dealing 1d4 damage for a short tool or 1d6 for a long tool\. The GM determines the damage type that’s appropriate or adjusts the damage if needed\./i, "Esta entrada es un cajón de sastre para las herramientas de mano básicas que no tienen un propósito aventurero específico. Una azada, una pala o un martillo pilón son herramientas largas, y un berbiquí, un gancho para hielo o una paleta son herramientas cortas. Una herramienta se suele poder utilizar como arma improvisada, infligiendo 1d4 daño para una corta o 1d6 para una larga. El DJ es quien determina el tipo de daño apropiado o ajusta la cantidad si es necesario."],
            [/Handheld instruments include bagpipes, a small set of chimes, small drums, fiddles and viols, flutes and recorders, small harps, lutes, trumpets, and similarly sized instruments\. The GM might rule that an especially large handheld instrument \(like a tuba\) has greater Bulk\. Heavy instruments such as large drums, a full set of chimes, and keyboard instruments are less portable and generally need to be stationary while being played\. A virtuoso instrument is more finely made and gives a \+1 item bonus to Performance checks using that instrument\./i, "Los instrumentos de mano incluyen gaitas, un carillón pequeño, tamboriles, violines y violas, flautas dulces y traveseras, arpas pequeñas, laúdes, trompetas e instrumentos de tamaño similar. El DJ podría establecer que un instrumento de mano especialmente grande (como una tuba) tiene una Impedimenta mayor. Los instrumentos pesados, como los tambores grandes, un carillón completo y los instrumentos de teclado son menos portátiles y por lo general requieren permanecer estacionarios cuando se tocan. Un instrumento de virtuoso está más finamente construido y concede un bonificador +1 por objeto a las pruebas de Interpretación utilizándolo."],
            [/This mobile collection of vials and chemicals can be used for simple alchemical tasks\. If you wear your alchemist’s toolkit, you can draw and replace them as part of the action that uses them\./i, "Esta colección móvil de viales y productos químicos se puede utilizar para tareas alquímicas sencillas. Si llevas puesto tu juego de herramientas de alquimista, puedes quitarlas y ponerlas como parte de la acción que las utiliza."],
            [/You need this toolkit to create items from raw materials with the Craft skill\. A sterling artisan’s toolkit gives you a \+1 item bonus to the check\. Different sets are needed for different work, as determined by the GM; for example, a blacksmith’s toolkit differs from a woodworker’s toolkit\. If you wear your artisan’s toolkit, you can draw and replace it as part of the action that uses it\./i, "Necesitas este juego de herramientas para crear objetos a partir de materia prima con la habilidad Artesanía. Un juego de herramientas de artesano excelentes te concede un bonificador +1 por objeto a la prueba. Hacen falta juegos diferentes para trabajos diferentes, a juicio del DJ; por ejemplo un juego de herramientas de herrero es diferente al de un carpintero. Si llevas puesto tu juego de herramientas de artesano, puedes quitarlas y ponerlas como parte de la acción que las utiliza."],
            [/You need a thieves’ toolkit to Pick Locks or Disable Devices \(of some types\) using the Thievery skill\. An infiltrator thieves’ toolkit adds a \+1 item bonus to checks to Pick Locks and Disable Devices\. If your thieves’ toolkit is broken, you can repair it by replacing the lock picks with replacement picks appropriate to your toolkit; this doesn’t require using the Repair action\. If you wear your thieves’ toolkit, you can draw and replace it as part of the action that uses it\./i, "Necesitas un juego de herramientas de ladrón para Forzar cerraduras o Inutilizar mecanismos (de algunos tipos) mediante la habilidad Latrocinio. Un juego de herramientas de ladrón infiltrador añaden un bonificador +1 por objeto a las pruebas para Forzar cerraduras e Inutilizar mecanismos. Si se rompe el juego puedes repararlo cambiando las ganzúas por otras de repuesto; esto no requiere utilizar la acción de Reparar. Si sostienes tu juego de herramientas de ladrón, puedes poner y sacar cosas como parte de la acción que las utiliza."],
            [/If your thieves’ toolkit is broken, you can repair it by replacing the lock picks with replacement picks appropriate to your toolkit;\./i, "Si se rompe el juego puedes repararlo cambiando las ganzúas por otras de repuesto."],
            [/You need an alchemist's lab to Craft alchemical items during downtime\./i, "Necesitas un laboratorio de alquimista para Elaborar sustancias alquímicas durante el tiempo libre."],
            [/An expanded alchemist's lab gives a \+1 item bonus to Crafting checks to create alchemical items\./i, "Un laboratorio de alquimista mejorado te concede un bonificador +1 por objeto a las pruebas de Artesanía para elaborar sustancias alquímicas."],
            [/This book contains the formulas for Crafting the 0-level common items\./i, "Este libro contiene las fórmulas para Elaborar todos los objetos comunes de nivel 0."],
            [/A spellbook holds the written knowledge necessary to learn and prepare various spells, a necessity for wizards \(who typically get one for free\) and a useful luxury for other spellcasters looking to learn additional spells\. Each spellbook can hold up to 100 spells\. The Price listed is for a blank spellbook\./i, "Un libro de conjuros contiene el conocimiento escrito necesario para aprender y preparar diversos conjuros, algo necesario para los magos (que suelen obtener uno gratis) y un lujo útil para otros lanzadores de conjuros que buscan aprender conjuros adicionales. Cada libro puede albergar hasta 100 conjuros. El Precio indicado es para un libro en blanco."],
            [/A formula book holds the formulas necessary to make items other than the common equipment from this chapter; characters of the alchemist class \(Player Core 2\) typically get one for free\. Each formula book can hold the formulas for up to 100 different items\. Formulas can also appear on parchment sheets, tablets, and almost any other medium; there’s no need for you to copy them into a specific book as long as you can keep them on hand to reference them\./i, "Un libro de fórmulas contiene las fórmulas necesarias para crear objetos diferentes al equipo común de este capítulo; los personajes de la clase alquimista suelen obtener uno gratuitamente. Cada libro de fórmulas puede albergar la fórmula de hasta 100 objetos diferentes. Las fórmulas también pueden aparecer en hojas de pergamino, tablillas y casi cualquier otro medio; no hay necesidad de que las copies a un libro específico si las puedes tener a mano para consultarlas."],
            [/A lantern sheds bright light and requires 1 pint of oil to function for 6 hours\. A bull’s-eye lantern emits its light in a 60-foot cone \(and dim light in the next 60 feet\)\. A hooded lantern sheds light in a 30-foot radius \(and dim light in the next 30 feet\) and is equipped with shutters, which you can close to block the light\. Closing or opening the shutters takes an Interact action\./i, "Una linterna emite luz brillante y requiere 1 pinta (0,5 l) de aceite para funcionar durante 6 horas. Una linterna de ojo de buey emite su luz en un cono de 60 pies (18 m), y luz tenue en los siguientes 60 pies (18 m). Una linterna sorda emite luz en un radio de 30 pies (9 m), y luz tenue en los siguientes 30 pies (9 m) y va equipada con obturadores que puedes cerrar para bloquear la luz. Abrir o cerrar los obturadores requiere una acción de Interactuar."],
            [/This quality handheld lens gives you a \+1 item bonus to Perception checks to notice minute details of documents, fabric, and the like\./i, "Esta lente de calidad que se puede empuñar te concede un bonificador +1 por objeto a las pruebas de Percepción para notar detalles minúsculos de documentos, telas, etc."],
            [/Maps are uncommon\. Most maps you can find are simple and functional\. A survey map details a single location in excellent detail\. One of these maps gives you a \+1 item bonus to Survival checks and any skill checks to Recall Knowledge, provided the checks are related to the location detailed on the map\. Maps sometimes come in atlases, containing a number of maps of the same quality, often on similar topics\. An atlas costs five times as much as a single map and requires both hands to use\. The GM determines what maps are available in any location\./i, "Los mapas son poco comunes. La mayoría de los que puedes encontrar son sencillos y funcionales. Un mapa topográfico detalla una sola ubicación con un nivel de detalle excelente. Uno de estos mapas te concede un bonificador +1 por objeto a las pruebas de Supervivencia y a cualquier prueba de habilidad para Recordar conocimiento, si está relacionada con la ubicación detallada en el mapa. Los mapas a veces se presentan en forma de atlas, que contienen cierto número de mapas de la misma calidad, a menudo sobre temas similares. Un atlas cuesta cinco veces más que un solo mapa y requiere ambas manos para utilizarlo. El DJ es quien determina qué mapas hay disponibles en cualquier lugar."],
            [/This kit of bandages, herbs, and suturing tools is necessary for Medicine checks to Administer First Aid, Treat Disease, Treat Poison, or Treat Wounds\. Expanded healer’s toolkits provide a \+1 item bonus to such checks\. If you wear your healer’s toolkit, you can draw and replace them as part of the action that uses them\./i, "Este conjunto de vendajes, hierbas y suturas es necesario para las pruebas de Medicina a fin de administrar Primeros auxilios, Tratar enfermedades, Tratar veneno o Tratar heridas. El material mejorado te proporciona un bonificador +1 por objeto a dichas pruebas. Si llevas puesto tu material de curas, puedes meter y sacar cosas como parte de la acción que lo utiliza."],
            [/This leather satchel contains empty vials, a pair of tweezers, a supply of small linen cloths, a set of brass calipers and a knotted string for measuring distances, several pieces of chalk, a pen, and a blank notebook for keeping notes\. Every component of a detective’s kit is of exceeding quality, and thus a detective’s kit adds a \+1 item bonus to checks to investigate a crime scene, a clue, or similar details\. Like other tool kits, a detective’s kit uses one hand if wearing the kit and two hands otherwise\./i, "Este morral de cuero contiene unos cuantos viales vacíos, unas pinzas, paños de lino pequeños, un juego de calibradores de bronce y un bramante anudado para medir distancias, varios trozos de tiza, una pluma y un bloc de notas en blanco. Todos los componentes del material de detective son de calidad excelente y por lo tanto suman un bonificador +1 por objeto a las pruebas para investigar la escena de un crimen, una pista o detalles similares. Como otros juegos de herramientas, el material de detective utiliza una mano si se lleva puesto y ambas de lo contrario."],
            [/This small wooden box contains cosmetics, false facial hair, spirit gum, and a few simple wigs\. You usually need a disguise kit to set up a disguise in order to Impersonate someone using the Deception skill\. An elite disguise kit adds a \+1 item bonus to relevant checks\. If you’ve crafted a large number of disguises, you can replenish your cosmetics supply with replacement cosmetics suitable for the type of your disguise kit\. You can draw and replace a worn disguise kit as part of the action that uses it\./i, "Esta cajita de madera contiene cosméticos, vello facial falso, goma líquida y unas cuantas pelucas sencillas. Por lo general necesitas material de disfraz para Imitar a otra persona mediante el uso de la habilidad Engaño. Un material de élite suma un bonificador +1 por objeto a las pruebas relevantes. Si has fabricado un gran número de disfraces, puedes completar tu suministro de cosméticos con otros de repuesto adecuados al tipo de tu material de disfraz. Si lo llevas puesto, puedes poner y quitar el material como parte de la acción que lo utiliza."],
            [/You can replenish your cosmetics supply with replacement cosmetics suitable for the type of your disguise kit./i, "Puedes completar tu suministro de cosméticos con otros de repuesto adecuados al tipo de tu material de disfraz."],
            [/This satchel includes 50 feet of rope, pulleys, a dozen pitons, a hammer, a grappling hook, and one set of crampons\. Climbing kits allow you to attach yourself to the wall you’re Climbing, moving half as quickly as usual \(minimum 5 feet\) but letting you attempt a DC 5 flat check whenever you critically fail to prevent a fall\. You gain a \+1 item bonus to Athletics checks to Climb while using an extreme climbing kit\. A single kit has only enough materials for one climber; each climber needs their own kit\. If you wear your climbing kit, you can access it as part of a Climb action\./i, "Este morral contiene 50 pies (15 m) de cuerda, poleas, una docena de pitones, un martillo, un garfio de abordaje y un juego de crampones. El material de escalada te permite fijarte a la pared que estás Trepando, moviéndote la mitad de lo habitual (mínimo 5 pies [1,5 m]) y permitiéndote hacer una prueba plana CD 5 siempre que fallas críticamente para evitar una caída. Obtienes un bonificador +1 por objeto a las pruebas de Atletismo para Trepar si utilizas material de escalada extrema. Uno de estos morrales contiene material para tan sólo un escalador; cada uno necesita el suyo. Si lo llevas puesto, puedes acceder a él como parte de la acción de Trepar."],
            [/Using a writing set, you can draft correspondence and scribe scrolls\. A set includes stationery, including a variety of paper and parchment, as well as ink, a quill or ink pen, sealing wax, and a simple seal\. If you’ve written a large amount, you can refill your kit with extra ink and paper\./i, "Utilizando material de escritura, puedes redactar correspondencia e inscribir pergaminos. Un juego incluye papel y sobres, con una gran variedad de papeles y pergaminos, así como tinta, un cálamo o pluma, lacre y un sello sencillo. Si has escrito mucho, puedes rellenar el juego con tinta y papel de repuesto."],
            [/This kit include a collapsible fishing pole, fishhooks, line, lures, and a fishing net\. Professional fishing tackle grants a \+1 item bonus to checks to fish\./i, "Esto incluye una caña de pescar plegable, anzuelos, sedal, cebos y una red de pesca. El material de pesca profesional concede un bonificador +1 por objeto a las pruebas para pescar."],
            [/A backpack holds up to 4 Bulk of items, and the first 2 Bulk of these items don’t count against your Bulk limits\. If you’re carrying or stowing the pack rather than wearing it on your back, its Bulk is light instead of negligible\./i, "Una mochila contiene hasta Impedimenta 4 de objetos y los primeros 2 puntos de Impedimenta de dichos objetos no cuentan contra tu límite. Si, en lugar de llevar la mochila a la espalda, la sostienes o la llevas guardada, su Impedimenta es ligera en lugar de insignificante."],
            [/When it’s full, a waterskin contains roughly 1 day’s worth of water for a Small or Medium creature\./i, "Cuando está lleno, un odre contiene aproximadamente la cantidad necesaria de agua de 1 día para una criatura Pequeña o Mediana."],
            [/A brass ear is a short, flared tube with one end narrow enough to comfortably fit against the ear canal\. When using it to listen through a door, window, thin wall, or similar barrier, if the barrier would normally increase the DC of your Perception check to hear sounds on the other side, the DC increases by only half as much as normal\. It’s not suitable for improving your hearing in general, a role better served by a hearing aid\./i, "Una oreja de bronce es un tubo corto y acampanado con un extremo lo suficientemente estrecho para introducirlo cómodamente en un oído. Cuando se usa para escuchar a través de una puerta, ventana, pared delgada o barrera similar, si la barrera incrementaría normalmente la CD de tu prueba de Percepción para oír sonidos al otro lado, sólo lo hace en la mitad de lo normal. No es adecuada para mejorar tu audición en general, porque para eso va mejor un audífono."],
            [/When Forcing Open an object that doesn’t have an easy grip, a crowbar makes it easier to gain the necessary leverage\. Without a crowbar, prying something open takes a –2 item penalty to the Athletics check to Force Open\. A levered crowbar grants you a \+1 item bonus to Athletics checks to Force Open anything that can be pried open\./i, "Cuando se Abre a la fuerza un objeto que no se puede agarrar fácilmente, una palanqueta hace más fácil obtener el brazo de palanca necesario. Sin una palanqueta, la prueba de Atletismo para Abrir algo a la fuerza sufre un penalizador -2 por objeto. Una palanqueta reforzada te concede un bonificador +1 por objeto a las pruebas de Atletismo para Abrir por la fuerza cualquier cosa que se puede abrir así."],
            [/Flint and steel are useful in creating a fire if you have the time to catch a spark, though using them is typically too time-consuming to be practical during an encounter\. Even in ideal conditions, using flint and steel to light a flame requires using at least 3 actions, and often significantly longer\./i, "El pedernal y la yesca se utilizan para encender fuego si tienes tiempo para utilizar una chispa aunque usarlos suele alargarse, de forma que el método no es práctico durante un encuentro. Incluso en las condiciones ideales, utilizar el pedernal y la yesca para encender una llama requiere el uso de por lo menos 3 acciones, y a menudo mucho más."],
            [/This is a 2-foot-long tube with two angled mirrors, one at each end\. When the mirrors are aligned correctly, you can look around obstacles while remaining behind cover\. This doesn’t provide a sufficient line of effect to target creatures around corners\./i, "Esto es un tubo de 2 pies (60 cm) de longitud con dos espejos angulados, uno en cada extremo. Cuando los espejos están correctamente alineados, puedes mirar alrededor de un obstáculo desde detrás de una cobertura. Esto no proporciona una línea de efecto suficiente para designar como objetivo a una criatura alrededor de una esquina."],
            [/When wielding this long pole, you can use Seek to search a square up to 10 feet away\. The pole is not sturdy enough to use as a weapon\./i, "Cuando empuñas esta larga pértiga puedes Buscar para sondear una casilla hasta a 10 pies (3 m) de distancia. La pértiga no es lo suficientemente recia como para utilizarla como arma."],
            [/These small spikes can be used as anchors to make climbing easier\. To affix a piton, you must hold it in one hand and use a hammer to drive it in with your other hand\. You can attach a rope to the hammered piton so that you don’t fall all the way to the ground on a critical failure while Climbing\./i, "Estas pequeñas púas se pueden utilizar como anclajes para trepar con más facilidad. Para fijar un pitón, tienes que sostenerlo en una mano y utilizar un martillo para clavarlo con la otra. Puedes fijar una cuerda al pitón clavado para no caer al suelo si sufres un fallo crítico mientras Trepas."],
            [/You can use a net either on its own or attached to a rope\. When attached to a rope, you can use the net to Grapple a Medium or smaller creature up to 10 feet away \(instead of only adjacent creatures\)\. You can continue to Grapple to keep your hold on the target so long as the target remains within 10 feet and you continue to hold the net\. The grabbed creature gains a \+2 circumstance bonus to Escape unless you are adjacent to them, and it can attempt a DC 16 Athletics check to Force Open the net entirely\. Once the target is no longer grabbed, the net is unwieldy until refolded with an Interact action with the concentrate trait that requires two hands; if used without being refolded, Grapple checks made with the net take a –2 penalty\. When the net is unattached, you can attempt a ranged attack roll using your simple weapon proficiency against a Medium or smaller creature within 20 feet\. On a hit, the target is off-guard and takes a –10-foot circumstance penalty to its Speeds until it Escapes, and on a critical hit, it’s also immobilized until it Escapes\. The Escape DC is 16\. A creature adjacent to the target can Interact to remove the net\./i, "Puedes utilizar una red, o bien sola, o bien amarrada a una cuerda. Cuando está amarrada a una cuerda, puedes utilizar la red para Apresar a una criatura Mediana o más pequeña a una distancia de hasta 10 pies (3 m) en lugar de sólo a criaturas adyacentes. Puedes continuar Apresando para mantener tu presa sobre el objetivo, si éste permanece a 10 pies (3 m) o menos y continúas sosteniendo la red. La criatura apresada obtiene un bonificador +2 por circunstancia a sus pruebas de Huir si no estás adyacente a ella y puede hacer una prueba de Atletismo CD 16 para Abrir la red por la fuerza. Una vez el objetivo deja de estar apresado, la red es engorrosa hasta que se vuelve a doblar mediante una acción de Interactuar con el rasgo concentrar que requiere dos manos; si se utiliza sin haber sido doblada, las pruebas de Apresar hechas con la red sufren un penalizador -2. Cuando la red no está amarrada puedes hacer una tirada de ataque a distancia utilizando tu competencia en armas sencillas contra una criatura Mediana o más pequeña a 20 pies (6 m) o menos. Con un impacto, el objetivo queda desprevenido y sufre un penalizador -10 pies (3 m) por circunstancia a sus Velocidades hasta que Huye y, con un impacto crítico, también queda inmovilizado hasta que Huye. La CD de Huir es 16. Una criatura adyacente al objetivo puede Interactuar para quitarle la red."],
            [/Ordinary clothing is functional with basic tailoring, such as peasant garb, monk’s robes, or  work clothes\./i, "La ropa normal es funcional y tiene un corte básico, como la de campesino, la de monje o la de trabajo."],
            [/Explorer’s clothing is sturdy enough that it can be reinforced to protect you, even though it isn’t a suit of armor\. It comes in many forms, though the most common resemble clerical vestments, monk’s garments, or wizard’s robes, as members of these classes likely avoid wearing armor\./i, "La ropa de explorador es lo suficientemente recia como para poderla reforzar y que te proteja, aunque no se puede considerar armadura. Hay muchas formas, aunque las más comunes se parecen a las vestimentas de clérigo, los adornos de monje o los ropajes de mago, puesto que los miembros de dichas clases es probable que eviten llevar armadura."],
            [/A sack can hold up to 8 Bulk worth of items\. A sack containing 2 Bulk or less can be worn on the body, usually tucked into a belt\. You can carry a sack with one hand, but must use two hands to transfer items in and out\./i, "Un saco puede acarrear hasta Impedimenta 8 en objetos. Un saco que contiene Impedimenta 2 o menos se puede llevar en el cuerpo, usualmente pasado por el cinto. Puedes llevar un saco en una mano, pero tienes que usar las dos para meter y sacar objetos."],
            [/When sounded, a signal whistle can be heard clearly up to half a mile away across open terrain\./i, "Cuando se sopla, un silbato de señales se puede oír claramente hasta a media milla (800 m) en terreno despejado."],
            [/Primal spellcasters, especially druids, often wear adornments of natural materials to symbolize their connection to nature, such as rings of woven plants, tokens made from animal parts, or other symbols related to a druidic order or nature philosophy\./i, "Los lanzadores de conjuros primigenios, especialmente los druidas, a menudo lucen adornos con materiales naturales para simbolizar su conexión con la Naturaleza, como por ejemplo anillos de plantas tejidas, amuletos hechos de partes de animales u otros símbolos relacionados con una orden druídica o filosofía de la Naturaleza."],
            [/This piece of wood or silver is emblazoned with an image representing a deity\. Some divine spellcasters, such as clerics, can use a religious symbol to use certain abilities\. A religious symbol can be worn on the body on a chain or pin, or can be held\./i, "Este trozo de madera o de plata está blasonado con una imagen que representa a un dios. Algunos lanzadores de conjuros divinos, como por ejemplo los clérigos, pueden emplear un símbolo religioso para usar ciertas aptitudes. Un símbolo religioso se puede llevar puesto en el cuerpo mediante una cadena o un broche, o puede sostenerse con la mano."],
            [/This manuscript contains scripture of a particular religion\. Some divine spellcasters, such as clerics, can use a religious text to use certain abilities\. A religious text must be held in one hand to use it\./i, "Este manuscrito contiene escrituras de una religión en particular. Algunos lanzadores de conjuros divinos, como por ejemplo los clérigos, pueden utilizar un texto religioso para usar ciertas aptitudes. Un texto religioso se tiene que sostener en una mano para utilizarlo."],
            [/You can draw this reinforced sheath during the same Interact action you use to draw the weapon it holds, wielding the weapon in one hand and the scabbard in your other\. A parrying scabbard can be used for your defense much like a weapon with the parry trait/i, "Puedes sacar esta vaina reforzada durante la misma acción de Interactuar que usas para desenvainar el arma que contiene, empuñando el arma en una mano y la vaina en la otra. Puedes utilizar para tu defensa una vaina de parada en gran medida como un arma con el rasgo parada: inviertes una acción para posicionarla defensivamente y obtienes un bonificador +1 por circunstancia a la CA hasta el inicio de tu siguiente turno. Hay vainas de parada disponibles para cualquier espada de las que se empuñan a una mano."],
            [/This leather sheath is large enough to hold an item of up to light Bulk and is typically used for daggers, wands, thieves’ toolkits, and similar objects\. You can affix it to the inside of a boot, under a bracer or sleeve, or in other inconspicuous locations to gain a \+1 item bonus to Stealth checks and DCs to hide or conceal the item within\./i, "Esta vaina de cuero es lo suficientemente grande como para alojar un objeto de hasta Impedimenta ligera y se utiliza típicamente para dagas, varitas, juegos de herramientas de ladrón y objetos similares. Puedes fijarla al interior de una bota, bajo unos brazales o una manga o en cualquier otro lugar discreto para obtener un bonificador +1 por objeto a las pruebas de Sigilo y a las clases de dificultad para esconder u ocultar el objeto de su interior."],
            [/A lit candle sheds dim light in a 10-foot radius for 8 hours\./i, "Una vela encendida emite luz tenue en un radio de 10 pies (3 m) durante 8 horas."],
            [/Rations for 1 week/i, "Raciones para una semana."],

            [/\bcurse\b/, "maldición"],
            [/\boccult\b/, "ocultismo"],

            [/\bPrice\b/i, "Precio"],
            [/\bHands\b/i, "Manos"],
            [/\bBulk\b/i, "Impedimenta"],
            [/\bUsage\b/i, "Usanza"],

            [/\bCritical Success\b/, "Éxito crítico"],
            [/\bCritical Failure\b/, "Fallo crítico"],
            [/\bSuccess\b/, "Éxito"],
            [/\bFailure\b/, "Fallo"],

            [/\bDexterity or other\b/, "Destreza u otra"],

            [/\ba number of additional skills equal to\b/, "tantas habilidades adicionales como"],
            [/\byour choice of Acrobatics or Athletics\b/, "Acrobacias o Atletismo, a elegir"],
            [/\bone skill determined by your choice of deity\b/, "una habilidad determinada por tu elección de dios"],
            [/\bone skill determined by your druidic order\b/, "una habilidad determinada por tu orden druídica"],
            [/\bone or more skills determined by your rogue's racket\b/, "una o más habilidades determinadas por tu enredo de pícaro"],
            [/\bone skill determined by your patron\b/, "una habilidad determinada por tu patrón"],
            [/\bplus your Intelligence modifier\b/, "más tu modificador por Inteligencia"],
            [/\bplus your Constitution modifier\b/, "más tu modificador por Constitución"],

            [/\bbard class DC\b/, "la CD de la clase bardo"],
            [/\bcleric class DC\b/, "la CD de la clase clérigo"],
            [/\bdruid class DC\b/, "la CD de la clase druida"],
            [/\bfighter class DC\b/, "la CD de la clase guerrero"],
            [/\branger class DC\b/, "la CD de la clase explorador"],
            [/\brogue class DC\b/, "la CD de la clase pícaro"],
            [/\bwitch class DC\b/, "la CD de la clase brujo"],
            [/\bwizard class DC\b/, "la CD de la clase mago"],

            [/\bsimple weapons\b/, "armas sencillas"],
            [/\bmartial weapons\b/, "armas marciales"],
            [/\badvanced weapons\b/, "armas avanzadas"],
            [/\bunarmed attacks\b/, "ataques sin armas"],
            [/\bthe favored weapon of your deity\. If your deity's favored weapon is uncommon, you also gain access to that weapon\./, "el arma predilecta de tu dios. Si dicha arma es poco común, también obtienes acceso a ella"],

            [/\bspell attack modifier\b/, "modificador al ataque de conjuro"],
            [/\bspell DC\b/, "la CD de conjuros"],

            [/\bUntrained in all armor, though your doctrine might alter this\b/, "No entrenado en todas las armaduras, aunque tu doctrina podría alterar esto"],
            [/\bUntrained in all armor\b/, "No entrenado en ninguna armadura"],
            [/\bTrained in unarmored defense\b/, "Entrenado en defensa sin armadura"],
            [/\ball armor\b/, "todas las armaduras"],
            [/\blight armor\b/, "armadura ligera"],
            [/\bmedium armor\b/, "armadura intermedia"],
            [/\bheavy armor\b/, "armadura pesada"],

            [/\bTrained in\b/, "Entrenado en"],
            [/\btrained in\b/, "rango entrenado en"],
            [/\bExpert in\b/, "Experto en"],
            [/\bexpert in\b/, "rango experto en"],
            [/\bMaster in\b/, "Maestro en"],
            [/\bmaster in\b/, "rango maestro en"],
            [/\bLegendary in\b/, "Legendario en"],
            [/\blegendary in\b/, "rango legendario en"],

            [/\bAmmunition arrow\b/i, "Munición para arcos"],
            [/\bAmmunition bolt\b/i, "Munición para ballestas"],
            [/\bAmmunition sling bullet\b/i, "Munición para hondas"],

            [/\byour Intelligence modifier \(if it(’|')s positive\)\./i, "tu modificador por Inteligencia (si es positivo)."],
            [/Additional languages equal to/i, "Tantos idiomas adicionales como"],
            [/\bChoose from the list of common languages\b/, "Elige de entre la lista de idiomas comunes"],
            [/\bChoose from\b/, "Elige entre"],
            [/and any other languages to which you have access \(such as the languages prevalent in your region\)\./i, "y cualquier otro idioma al que tienes acceso (por ejemplo, los predominantes en tu región)."],
            [/\bChthonian\b/, "Chthoniano"],
            [/\bCommon\b/, "Común"],
            [/\bDiabolic\b/, "Diabólico"],
            [/\bDraconic\b/, "Dracónico"],
            [/\bDwarven\b/, "Enano"],
            [/\bElven\b/, "Elfo"],
            [/\bEmpyrean\b/, "Empíreo"],
            [/\bFey\b/, "Feérico"],
            [/\bGnomish\b/, "Gnomo"],
            [/\bHalfling\b/, "Mediano"],
            [/\bOrcish\b/, "Orco"],
            [/\bPetran\b/, "Petrano"],
            [/\bPyric\b/, "Pírico"],
            [/\bShadowtongue\b/, "Lengua sombría"],
            [/\bSussuran\b/, "Sussurano"],
            [/\bTaldane\b/, "Taldano"],
            [/\bThalassic\b/, "Talásico"],

            [/\bSkill\b/, "Habilidad"],
            [/\bAcrobatics\b/, "Acrobacias"],
            [/\bArcana\b/, "Arcanos"],
            [/\bAthletics\b/, "Atletismo"],
            [/\bCrafting\b/, "Artesanía"],
            [/\bDeception\b/, "Engaño"],
            [/\bDiplomacy\b/, "Diplomacia"],
            [/\bIntimidation\b/, "Intimidación"],
            [/\bLore\b/, "Saber"],
            [/\bMedicine\b/, "Medicina"],
            [/\bNature\b/, "Naturaleza"],
            [/\bOccultism\b/, "Ocultismo"],
            [/\bPerception\b/, "Percepción"],
            [/\bPerformance\b/, "Interpretación"],
            [/\bReligion\b/, "Religión"],
            [/\bSociety\b/, "Sociedad"],
            [/\bStealth\b/, "Sigilo"],
            [/\bSurvival\b/, "Supervivencia"],
            [/\bThievery\b/, "Latrocinio"],

            [/\bStrength\b/, "Fuerza"],
            [/\bDexterity\b/, "Destreza"],
            [/\bConstitution\b/, "Constitución"],
            [/\bIntelligence\b/, "Inteligencia"],
            [/\bWisdom\b/, "Sabiduría"],
            [/\bCharisma\b/, "Carisma"],

            [/\bFortitude\b/, "Fortaleza"],
            [/\bReflex\b/, "Reflejos"],
            [/\bWill\b/, "Voluntad"],

            [/\bTradition\b/, "Tradición"],
            [/\bArcane\b/, "Arcana"],
            [/\bDivine\b/, "Divina"],
            [/\bOccult\b/, "Ocultista"],
            [/\bPrimal\b/, "Primigenia"],

            [/(?<=\d)\s?ft\./, " pies"],
            [/\bfeet\b/i, "pies"],
            [/\bTiny\b/, "Menudo"],
            [/\bSmall\b/, "Pequeño"],
            [/\bMedium\b/, "Mediano"],
            [/\bLarge\b/, "Grande"],
            [/\bHuge\b/, "Enorme"],
            [/\bGargantuan\b/, "Gargantuesco"],

            [/\bNo description\b/i, "Sin descripción"],

            [/\bor\b/, "o"],
        ]

        // ==== style rules =======================================================================|

        document.head.append(Object.assign(document.createElement("style"), {
            type: "text/css",
            textContent: `.speedsizerow {
                width: max-content;
            }
            .modal-button {
                min-width: max-content;
            }
            .section-menu-fake {
                margin-right: 1em;
                color: #a1a1a1;
                display: inline-block;
                cursor: pointer;
                font-size: 1.3em;
            }
            .section-menu-fake:hover {
                color: #ff5722;
            }
            .section-menu-selected-fake {
                color: #ff5722 !important;
            }`
        }))

        // ==== AC. special rules =================================================================|

        const enableSpecialRules = 1;
        if (enableSpecialRules) {
            // example of including a rule list defined in a spearate script.
            if (unsafeWindow.globalListName) {
                replaceRules = replaceRules.concat(unsafeWindow.globalListName);
            }
        }
        //consolelog(replaceRules,"all rules"); //test: double check rule contents

        // ==== BA. script options ================================================================|

        const classWhitelist = /notif-hidden|notif-text|tag-inst|-counter/i;
        // text nodes with parent elements with these classes are excluded.

        const generateRecheckButton = 1;

        let dynamicChecking = 1; // default 1; set to 1 to run the script automatically when new image elements are detected.
        dynamicChecking = getOptionState("enable-"+ scriptPrefix +"dynamic-checking", dynamicChecking);
        // setting to 0 would make this run a few more times when dynamically checking.

        // ==== checked in processPage() ====
        // managable with optional Script Options userscript.
        let logRuntimes = 1; // default 0; set to 1 to log function runtimes to the console.
        let markCheckedElements = 1; // default 1; set to 0 if certain sites start appearing weirdly.

        let enableSpecialReplace = 0;
        let fullDelete = 0; // default 1; if 1, text is completely replaced.
        let addTag = 0; // if fullDelete is active, adds a tag without replacing.

        // ==== BB. notif code ====================================================================|

        // 'script options' options
        let enableExecCounter = 0;
        enableExecCounter = getOptionState("enable-"+ scriptPrefix +"counter", enableExecCounter);
        let enableNotifications = 0;
        enableNotifications = getOptionState("enable-"+ scriptPrefix +"notifs", enableNotifications);
        let autohideNotifs = 0; // default 0; notifs disappear after a set period of time. used in createNotif()
        let startCollapsed = 1; //default 1;

        // notif css variables.
        const notifsHex = "#ddd";
        const notifsOpacity = .4; // default .4; set to a value between 0 and 1, 1 is no transparency, .5 is 50% transparency.
        const notifsWidth = 120; // default 120; width in pixels of each notification.

        let notifContainerId = "notif-main-container";

        // generate notif container if needed.
        if ((enableExecCounter || enableNotifications) && !jQuery("#"+ notifContainerId).length) {

            // ==== setting/checking initial visual state of notifs ====

            // constrolled exclusively by local storage or the default value.
            const localStorageName = "notif start collapsed";
            if (window.localStorage.getItem(localStorageName)) {
                startCollapsed = window.localStorage.getItem(localStorageName);
                startCollapsed = (startCollapsed == "true");
            }

            const visibleClass = "notif-visible";
            const hiddenClass = "notif-hidden1";
            let startingStateClass = visibleClass;
            let otherStartingStateClass = hiddenClass;
            if (startCollapsed) {
                startingStateClass = hiddenClass;
                otherStartingStateClass = visibleClass;
            }

            // ==== create container ==============================================================|
            /*
            [ notif main container
                [notif1] - counters
                [hide] - button
                [open] - button
                [close] - button
                [clear] - button
                [notif2
                    [dlt-container]
                    [ll-container]
                    [ot-container]
                ]

            ]
            - hide: makes visible open | hides close, clear, notif2
            - open: makes visible hide, close, clear, notif2 | hides open
            - close: deletes notif main container.
            - clear: empties notif-container2
            */

            const openButtonId = "notif-open";
            const hideButtonId = "notif-hide";

            let notificationsElement =
                "<div id='"+ notifContainerId +"'>"+
                "<div id='notif-container1'></div>"+
                "<div id='"+ hideButtonId +"' class='notif-red notif-rounded-block "+ startingStateClass +"'>notif hide</div>"+
                "<div id='"+ openButtonId +"' class='notif-green notif-rounded-block "+ otherStartingStateClass +"'>notif open</div>"+
                "<div id='notif-close' class='notif-gray notif-rounded-block "+ startingStateClass +"'>close notif[]</div>"+
                "<div id='notif-clear' class='notif-orange notif-rounded-block "+ startingStateClass +"'>clear notif</div>"+
                "<div id='notif-container2' class=' "+ startingStateClass +"'>"+
                    "<div id='dlt-container'></div>"+
                    "<div id='ll-container' class='notif-hidden1'></div>"+
                    "<div id='ot-container' class='notif-hidden1'</div>"+
                "</div>"+
                "</div>";
            jQuery("body").prepend(notificationsElement);

            let textReaderElement =
                "<div id='notif-text-overlay' class='notif-text-hidden'></div>";
            jQuery("body").prepend(textReaderElement);

            jQuery('#notif-container2').on( {
                mouseenter: function () {
                    let notifText = jQuery(this).find(".notif-text").text();
                    let notifClassList = this.className;
                    if (/red/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-red");
                    }else if (/orange/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-orange");
                    }else if (/yellow/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-yellow");
                    }else {
                        jQuery("#notif-text-overlay").addClass("notif-gray");
                    }
                    jQuery("#notif-text-overlay").text(notifText);
                    jQuery("#notif-text-overlay").addClass("notif-text-visible");
                },
                mouseleave: function () {
                    jQuery("#notif-text-overlay").removeClass("notif-text-visible");
                    jQuery("#notif-text-overlay").removeClass("notif-red");
                    jQuery("#notif-text-overlay").removeClass("notif-orange");
                }
            }, '.notif-instance');

            // ==== close ====
            jQuery("#notif-close").click(function(){
                jQuery("#"+notifContainerId).remove();
                //console.log("RPL notif close clicked. ("+notifContainerId+")");
            });

            // ==== clears container2 which contains notif instances. ====
            function clearNotif(){
                jQuery("#notif-container2").empty();
            }
            jQuery("#notif-clear").click(clearNotif);

            // ==== open/hide events ==============================================================|

            const mainSelector = "#notif-container2, #"+ hideButtonId +", #notif-close, #notif-clear";

            jQuery("#"+ hideButtonId).click(function () {
                //console.log(hideButtonId);
                window.localStorage.setItem(localStorageName, true);

                switchClasses(
                    mainSelector,
                    "#"+ openButtonId,
                    visibleClass,
                    hiddenClass
                );
            });

            jQuery("#"+ openButtonId).click(function () {
                //console.log(openButtonId);
                window.localStorage.setItem(localStorageName, false);

                switchClasses(
                    mainSelector,
                    "#"+ openButtonId,
                    hiddenClass,
                    visibleClass
                );
            });

            function switchClasses(mainSelector, subSelector, removedClass, newClass) {
                jQuery(mainSelector).removeClass(removedClass);
                jQuery(mainSelector).addClass(newClass);
                jQuery(subSelector).removeClass(newClass);
                jQuery(subSelector).addClass(removedClass);
            }

            // ==== CSS ===========================================================================|
            if(1){var notifsCss =
    `<style type="text/css">
        #`+ notifContainerId +` {
            width: `+ notifsWidth +`px;
            max-height: 50%;
            margin: 0 2px 2px;
            display: block;

            line-height: initial;
            color: #000;
            opacity: `+ notifsOpacity +`;
            position: fixed;
            top: 0px;
            right: 0px;
            z-index: 9999;
            overflow-y: auto;
        }
        #`+ notifContainerId +`:hover {
            opacity: 1;
        }

        .notif-rounded-block {
            display: block;
            padding: 2px;
            border-radius: 3px;
            margin-top: 2px;

            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
        }

        .s-counter {
            display: block;
            padding: 2px;
            border-radius: 4px;
            margin-top: 2px;

            background: #ddd;
            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
        }

        .notif-text-hidden {
            display:none;
        }
        .notif-text-visible {
            display: block;
            max-width: 50%;
            padding: 5px;
            border: #999 solid 2px;
            border-radius: 10px;

            position: fixed;
            top: 5px;
            left: 5px;
            z-index: 999999;


            font-size: 15px !important;
            font-weight: bold !important;
            text-align: center !important;
            color: black !important;
        }

        .notif-instance {
            display: block;
            padding: 2px;
            border-radius: 4px;
            margin-top: 2px;

            background: `+ notifsHex +`;
            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
        }

        .notif-instance div{/* div holding the rule.*/
            max-height: 12px;
            padding: 0px;
            margin: 0px;
            border: 0px;

            overflow: hidden;
            word-break: break-all;
        }
        .notif-hidden{ /* meant to hide the rule */
            opacity: .1;
        }
        .notif-hidden:hover {
            opacity: 1;
        }

        .notif-red {
            background: #f67066;
        }
        .notif-orange {
            background: #ffc107; //yellowish
        }
        .notif-yellow {
            background: #ffc107; //yellowish
        }
        .notif-green {
            background: #62bb66;
        }
        .notif-gray {
            background: #777;
        }

        /* collapsible classes */
        .notif-hidden1 {
            display: none !important;
        }
        .notif-visible {
            display: block !important;
        }

        div#ll-container, div#ot-container {
            border-top: solid black 3px;
        }
    </style>`;
            }
            jQuery(document.body).append(notifsCss);
        }

        if(enableExecCounter) {
            jQuery("#notif-container1").prepend("<div id='"+ scriptTag +"-counter' class='s-counter .notif-rounded-block'>T No text nodes found.</div>");
        }

        // resets lastIndex on tests with global modifiers.
        RegExp.prototype.regexTest = function(testString){
            //consolelog("## regexTest() ##", 1);
            if (this.test(testString)) {
                if (/.\/i?g/.test(this) && this.lastIndex) {//regex global modifier needs to be reset.
                    //consolelog("## last index: "+ this.lastIndex +" ##", 1);
                    this.lastIndex = 0;
                }
                return true;
            }
            return false;
        };

        NodeList.prototype.forEach = Array.prototype.forEach;

        // ==== CA. processPage() =================================================================|

        // ==== processPage() globals ====
        let titleChecked = 0; // if the page title was checked or not.
        let fullCheck = 0;

        // ==== counters ====
        let nodeCounter = 0; // counts text nodes.
        let deleteMatches = 0;
        let fullReplaceMatches = 0;
        let executionCounter = 0; // the number of times processPage() was executed.
        let sectionMenuChecked = false;

        // delegated: matches problematic elements at click time, even if added/hidden/recreated later.
        jQuery(document).on("click", ".trait", function (e) {
            e.preventDefault();
            const traitTextNode = this.firstChild;
            if (!traitTextNode) return;
            const spanishText = traitTextNode.nodeValue;
            const englishText = getEnglish(spanishText);
            traitTextNode.nodeValue = englishText != null ? englishText : spanishText;
            setTimeout(() => { traitTextNode.nodeValue = spanishText; }, 50);
        });

        function processPage() {
            executionCounter++;

            logRuntimes = getOptionState("log-"+ scriptPrefix +"runtimes", logRuntimes);
            if (logRuntimes) {
                var startTime = performance.now();
            }

            let rulesNum = replaceRules.length;

            // per element variables
            let ruleMatched = 0;

            // ==== checks the title of the page ==================================================|
            if(1){
                let titleText = jQuery("title").text();
                if (titleText && !titleChecked) {
                    for (let index = 0; index < rulesNum; index++) {
                        if (replaceRules[index][0].regexTest(titleText)) {
                            consolelog(scriptTag +" (title match): "+ titleText +" | "+ replaceRules[index][0], "TT-MA");
                            titleText = titleText.replace(replaceRules[index][0], replaceRules[index][1]);
                            jQuery("title").text(titleText);
                        }
                    }
                    titleChecked = 1;
                }
            }

            // ==== selects specified text elements ===============================================|
            if(1){
                const excludedElements = /CODE|SCRIPT|STYLE|TEXTAREA/i;
                const checkClassRegex = new RegExp(scriptPrefix +"node","i");
                var textWalker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function (node) {
                            if (node.nodeValue.trim() &&
                                !excludedElements.test(node.parentNode.nodeName) && // exclude scripts and style elements
                                (fullCheck || !checkClassRegex.test(node.parentNode.classList)) && // exclude checked elements
                                !classWhitelist.test(node.parentNode.classList)) {
                                return NodeFilter.FILTER_ACCEPT;
                            }
                            return NodeFilter.FILTER_SKIP;
                        }
                    },
                    false
                );
            }
            let textNode = textWalker.nextNode();
            let previousParent;

            // Phase 1: collect all nodes before mutating any classList.
            let nodesToProcess = [];
            while (textNode) {
                nodesToProcess.push(textNode);
                textNode = textWalker.nextNode();
            }

            // Phase 2: mark + replace using the pre-collected list.
            for (const textNode of nodesToProcess) {
                let nodeText = textNode.nodeValue;
                // let parentNodeClass = textNode.parentNode.classList;
                // let grandparentNodeClass = textNode.parentNode.parentNode.classList;
                // let previousSiblingTag;
                // if (textNode.previousSibling) { previousSiblingTag = textNode.previousSibling.nodeName; }
                if (!fullCheck) {
                    let immediateParentNode = textNode.parentNode;
                    nodeCounter++;

                    if (previousParent && !(previousParent == immediateParentNode)) {
                        markCheckedElements = getOptionState(scriptPrefix + "mark-checked", markCheckedElements);
                        if (markCheckedElements) {
                            previousParent.classList.add(scriptPrefix + "node-" + nodeCounter);
                        }
                        previousParent = immediateParentNode;
                    } else if (!previousParent) {
                        previousParent = immediateParentNode;
                    }
                }

                let rulesToUse = getReplaceRules(textNode);
                if (rulesToUse == null) continue;
                rulesNum = rulesToUse.length;

                // if (grandparentNodeClass.contains("listview-detail")
                //     || parentNodeClass.contains("layout-item")) {
                //     console.log("I have a special parent: " + nodeText);
                //     if (previousSiblingTag == "B") {
                //         console.log("I have a <b> sibling: " + nodeText);
                //         rulesToUse = replaceRules;
                //     } else {
                //         const specialClasses = ["listview-detail", "layout-item"];
                //         let useGrandparent = false;
                //         for (const specialClass of specialClasses) {
                //             if (grandparentNodeClass.contains(specialClass)) { useGrandparent = true; }
                //         }
                //         rulesToUse = getReplaceRules(useGrandparent ? textNode.parentNode : textNode);
                //         rulesNum = rulesToUse.length;
                //     }
                // } else if (parentNodeClass) {
                //     rulesToUse = getReplaceRules(textNode);
                //     rulesNum = rulesToUse.length;
                // } else {
                //     rulesToUse = replaceRules;
                // }

                // ==== for each rule =============================================================|
                for (let index = 0; index < rulesNum; index++) {

                    let currentRuleRegex = rulesToUse[index][0];
                    let replacementValue = rulesToUse[index][1];

                    if (currentRuleRegex.regexTest(nodeText.trim())) {
                        ruleMatched = 1;
                        let matchPrefix = "GEN0";
                        consolelog("("+ scriptTag +") (n)"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, "TXT-MA");

                        const disableReplace = 0; // test: check what is checked through each run.
                        if (!disableReplace) {

                            enableSpecialReplace = getOptionState("enable-special-replace", enableSpecialReplace);
                            // ==== delete1 match =================================================|
                            if (enableSpecialReplace && (/DELETE1/.test(replacementValue) || /DELETE2/.test(replacementValue)) ) {
                                deleteMatches++;

                                matchPrefix = "DLT99";
                                if (/DELETE1/.test(replacementValue) && !/DELETE1/.test(nodeText)) {
                                    matchPrefix = "DLT1";
                                }else if (/DELETE2/.test(replacementValue) && !/DELETE2/.test(nodeText)) {
                                    matchPrefix = "DLT2";
                                }

                                consolelog("("+ scriptTag +") ("+ matchPrefix +") n"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, matchPrefix);
                                createNotif(nodeCounter +" "+ matchPrefix, currentRuleRegex, nodeText);

                                fullDelete = getOptionState("enable-full-delete", fullDelete);
                                addTag = getOptionState("add-tag", addTag);
                                const tagRegex = new RegExp("^\\["+matchPrefix);

                                if (fullDelete) {
                                    nodeText = "## "+ matchPrefix +" ##"; // replaces the text completely.
                                    break;
                                }else if (addTag && !tagRegex.text(nodeText)) {
                                    nodeText = "["+ matchPrefix +"]: " + nodeText; // prepends DLT1 or DLT2
                                }
                            }
                            // ==== full replace match ============================================|
                            if (enableSpecialReplace && /^FR1/.test(replacementValue)) {
                                fullReplaceMatches++;
                                matchPrefix = "FR1";
                                consolelog("("+ scriptTag +") ("+ matchPrefix +") n"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, matchPrefix);
                                createNotif(nodeCounter +" "+ matchPrefix, currentRuleRegex, nodeText);

                                nodeText = replacementValue;
                                break;
                            }
                            // ==== base case =====================================================|
                            nodeText = nodeText.replace(currentRuleRegex, replacementValue);
                        } // end if (!disableReplace)
                    }
                } // end for (each rule) ==========================================================|

                if (ruleMatched) { // modify text block.
                    ruleMatched = 0;
                    textNode.nodeValue = nodeText;
                    consolelog("("+ scriptTag +") (n)"+ nodeCounter +" (text): "+ nodeText.trim(), "CH-TT");
                }
            } // end for (textNode) =============================================================|

            if (!fullCheck) {
                // ==== update counter ====
                let counterText = "T DLT:"+ deleteMatches +" | FR:"+ fullReplaceMatches +" | N:"+ nodeCounter + " | EX:"+ executionCounter;
                jQuery("#"+ scriptTag +"-counter").text(counterText);
                if (nodeCounter) {
                    jQuery("#"+ scriptTag +"-counter").addClass("notif-green");
                }
            }else { //end fullCheck.
                fullCheck = 0;
            }

            //consolelog("## ("+ scriptTag +") execution #"+ executionCounter +" ##", "EXEC");
            // script option handles if this is displayed or not.
            if (logRuntimes) {
                const endTime = performance.now();
                const runTime = ((endTime - startTime) / 1000).toFixed(2);
                if (runTime > 1) {
                    consolelog('('+ scriptTag +') finished after ' + runTime + ' seconds.', "RUNT");
                }else {
                    consolelog('('+ scriptTag +') finished in less than 1 second.', "RUNT");
                }
            }
        } //end function function replaceText()

        function getEnglish(spanishText) {
            let rulesNum = reverseReplaceRules.length;

            for (let index = 0; index < rulesNum; index++) {
                let currentRuleRegex = reverseReplaceRules[index][0];
                let replacementValue = reverseReplaceRules[index][1];

                if (currentRuleRegex.regexTest(spanishText.trim())) {
                    return spanishText.replace(currentRuleRegex, replacementValue);
                }
            }
        }

        function getReplaceRules(textNode) {
            let parentNode = textNode.parentNode;
            let grandparentNode;
            if (parentNode) { grandparentNode = parentNode.parentNode; }
            let previousSibling;
            if (textNode.previousSibling) { previousSibling = textNode.previousSibling; }
            let englishTabs = ["Weapons", "Defense", "Gear", "Spells", "Pets", "Details", "Feats", "Actions"];
            let spanishTabs = ["Armas", "Defensa", "Equipo", "Conjuros", "Mascotas", "Detalles", "Dotes", "Acciones"];

            switch (true) {
                case (!parentNode):
                    return replaceRules;
                    break;
                case (!parentNode.classList):
                    return replaceRules;
                    break;
                case parentNode.classList.contains("section-menu"):
                    if (!parentNode.previousSibling && textNode.nodeValue != "Weapons") return sectionMenuReplaceRules;
                    if (textNode.nodeValue == "Weapons" || englishTabs.includes(parentNode.previousSibling.firstChild.nodeValue)) { // so 'Gear' tab doesn't get renamed and break navigation
                        let spanishNode = parentNode.cloneNode(true);
                        spanishNode.classList.remove("section-menu");
                        spanishNode.classList.remove("section-menu-selected");
                        spanishNode.classList.add("section-menu-fake");
                        //if (textNode.nodeValue == "Weapons") {
                            // spanishNode.classList.add("section-menu-selected-fake");
                        //}
                        spanishNode.firstChild.nodeValue = spanishTabs[englishTabs.findIndex((text) => text == textNode.nodeValue)];
                        spanishNode.addEventListener("click", (e) => {
                            // spanishNode.classList.add("section-menu-selected-fake");
                            let siblings = Array.from(grandparentNode.children);
                            let thisIndex = siblings.findIndex((node) => node == spanishNode);
                            let englishNode = grandparentNode.children[thisIndex % 8];
                            console.log(englishNode.firstChild.nodeValue);
                            englishNode.click();
                        });
                        // if (!sectionMenuChecked) {
                        //     grandparentNode.addEventListener("click", (e) => {
                        //         for (const node of grandparentNode.childNodes) {
                        //             if (node.classList.contains("section-menu-fake")) {
                        //                 if (e.target != node) {
                        //                     node.classList.remove("section-menu-selected-fake");
                        //                 }
                        //             }
                        //         }
                        //     });
                        //     sectionMenuChecked = true;
                        // }
                        parentNode.setAttribute("style", "display: none;");
                        grandparentNode.lastChild.after(spanishNode);
                        return null;
                    } else {
                        return sectionMenuReplaceRules;
                    }
                    break;
                case (grandparentNode.classList.contains("listview-detail")
                      || parentNode.classList.contains("layout-item")):
                    console.log("I have a special parent: " + textNode.nodeValue);
                    if ((previousSibling ?? textNode).nodeName == "B") {
                        console.log("I have a <b> sibling: " + textNode.nodeValue);
                        if (textNode.nodeValue == " Chain") {
                            textNode.nodeValue = " Malla";
                            return null;
                        } else {
                            return replaceRules;
                        }
                    } else {
                        return listviewDetailReplaceRules;
                    }
                    break;
                case parentNode.classList.contains("listview-detail"):
                    return listviewDetailReplaceRules;
                    break;
                case parentNode.classList.contains("layout-item"):
                    return listviewDetailReplaceRules;
                    break;
                default:
                    return replaceRules;
            }
        }

        // ==== CB. execution control =============================================================|

        //console.log("("+ scriptTag +") EXEC: Initial run.");
        //processPage();
        let runWhenReady = 0;
        runWhenReady = getOptionState("run-when-ready", runWhenReady);
        if (runWhenReady) {
            jQuery(document).ready(function() { //after DOM has loaded.
                consolelog("("+ scriptTag +") EXEC: document.ready()", "EXEC");
                //fullCheck = 1;
                processPage();
            });
        }

        let runWhenLoaded = 1;
        runWhenLoaded = getOptionState("run-when-loaded", runWhenLoaded);
        if (runWhenLoaded) {
            jQuery(window).on("load", function() { //after all initial images are loaded.
                consolelog("("+ scriptTag +") EXEC: window.load()", "EXEC");
                //fullCheck = 1;
                processPage();
            });
        }
        if (dynamicChecking) {
            jQuery(document).ready(waitForKeyElements("img", processPage));
            jQuery(document).ready(waitForKeyElements(".modal-content", processPage));
            jQuery(document).ready(waitForKeyElements(".modal-content", processPage));
        }

        // ==== DA. script button =================================================================|

        let buttonsContainerId = "ctb-container1";
        if (generateRecheckButton && jQuery("#"+ buttonsContainerId).length) {
            jQuery("#"+ buttonsContainerId).prepend("<div id='"+ scriptTag +"-reset' class='ctb-blue ctb-rounded-block'>run "+ scriptTag +"</div>"); //added to beginning
            //jQuery("#"+ scriptTag +"-reset").click(processPage);
            jQuery("#"+ scriptTag +"-reset").click(function() {
                fullCheck = 1;
                processPage();
            });
        }

        // ==== DB. support functions =============================================================|

        function createNotif(notifLabel, notifRule, notifText) { //msg1 needs to match notifTypes
            enableNotifications = getOptionState("enable-"+ scriptPrefix +"notifs", enableNotifications);
            if (enableNotifications) {
                let additionalClass = "notif-gray";
                let notifContainer = "ot-container";
                if (/dlt/i.test(notifLabel)) {
                    additionalClass = "notif-red";
                    notifContainer = "dlt-container";
                }

                let newNotif =
                    "<div class='notif-instance "+ additionalClass +"'><div>t n"+ notifLabel +"</div>"+
                        "<div class='notif-hidden'>"+ notifRule +"</div>"+
                        "<div class='notif-text' hidden>"+ notifText+"</div>"+ // to be displayed at the bottom left.
                    "</div>";

                let enabledNotifTypesRegex = /./;
                if (enabledNotifTypesRegex.test(notifLabel)) {
                    jQuery("#"+ notifContainer).append(newNotif);
                    jQuery(".notif-instance").click(function(){
                        jQuery("#notif-container2").empty();
                    });

                    if (!/dlt/i.test(notifLabel)) {
                        jQuery("#ot-container").removeClass("notif-hidden1");
                    }

                    autohideNotifs = getOptionState("autohide-notifications", autohideNotifs);
                    if (autohideNotifs) {
                        const notifDuration = 10; // default 10; amount of seconds notifications are displayed before disappearing.
                        setTimeout(function() {
                            jQuery(".notif-instance").remove();
                        }, notifDuration*1000);
                    }
                }
            }
        } // end function creatNotif()

        function consolelog(text, messageType) {
            if (enableConsoleMessages && enabledMessagesRegex.test(messageType)) {
                console.log(text);
            }
        }

        // ==== script end ========================================================================|
        consolelog("#### ("+ scriptTag +") text replace script is active. ####", "EXEC");

    } // end if (runScript)

    // ============================================================================================|

    // = getOptionState(, );
    // used to update option if 'script option' is set.
    function getOptionState(idName, currentState) {
        if (document.getElementById(idName)) {
            return document.getElementById(idName).checked;
        }
        return currentState;
    }
})();